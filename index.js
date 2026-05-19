const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const net = require('net');
const protobuf = require('protobufjs');

const app = express();
const HTTP_PORT = 80;
const HTTPS_PORT = 443;
const TCP_PORT = 7006;

// ⚙️ Config
const MY_DOMAIN = 'navivpn.sytes.net';
const MY_IP = '103.6.168.170';
const MY_URL_HTTPS = `https://${MY_DOMAIN}`;
const TARGET_HOST = 'loginbp.ggpolarbear.com';
const TARGET_BATTLE_HOST = 'csoversea.stronghold.freefiremobile.com';

// Protobuf for MajorLogin
const root = protobuf.Root.fromJSON({
    nested: {
        MajorLoginResponse: {
            fields: {
                field1: { type: "uint64", id: 1 },
                field2: { type: "string", id: 2 },
                field3: { type: "string", id: 3 },
                field4: { type: "string", id: 4 },
                field5: { type: "string", id: 5 },
                field8: { type: "string", id: 8 },
                field9: { type: "uint32", id: 9 },
                field10: { type: "string", id: 10 },
                field15: { type: "Field15Msg", id: 15 },
                field16: { type: "string", id: 16 },
                field19: { type: "string", id: 19 },
                field21: { type: "uint32", id: 21 },
                field22: { type: "bytes", id: 22 },
                field23: { type: "bytes", id: 23 },
                field24: { type: "string", id: 24 },
                field25: { type: "Field25Msg", id: 25 }
            }
        },
        Field15Msg: { fields: { sub1: { type: "uint32", id: 1 } } },
        Field25Msg: { fields: {
            sub1: { type: "string", id: 1 },
            sub2: { type: "uint32", id: 2 },
            sub5: { type: "uint32", id: 5 },
            sub6: { type: "uint32", id: 6 },
            sub7: { type: "uint32", id: 7 }
        }}
    }
});

const LoginResponseMsg = root.lookupType("MajorLoginResponse");

// SSL
let sslOptions;
try {
    sslOptions = {
        key: fs.readFileSync(`/etc/letsencrypt/live/${MY_DOMAIN}/privkey.pem`),
        cert: fs.readFileSync(`/etc/letsencrypt/live/${MY_DOMAIN}/fullchain.pem`)
    };
    console.log('✅ SSL Loaded');
} catch (err) {
    console.error('❌ SSL Error:', err.message);
    process.exit(1);
}

// Raw Body
app.use((req, res, next) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => { req.rawBody = Buffer.concat(chunks); next(); });
});

// ====================== MINIMAL ver.php ======================
app.get('/ver.php', (req, res) => {
    const clientIp = req.ip.replace('::ffff:', '');
    
    const verData = {
        "code": 0,
        "is_server_open": true,
        "is_firewall_open": false,
        "server_url": `${MY_URL_HTTPS}/`,
        "ggp_url": MY_IP,
        "core_url": MY_IP,
        "core_ip_list": [MY_IP],
        "latest_release_version": "OB53",
        "remote_version": "1.123.8",
        "country_code": "SG",
        "client_ip": clientIp,
        "need_track_hotupdate": false,
        "should_check_ab_load": false,
        "use_login_optional_download": false
    };

    res.json(verData);
    console.log(`✅ Minimal ver.php sent to ${clientIp}`);
});

// ====================== MajorLogin ======================
app.post('/MajorLogin', (req, res) => {
    console.log(`🎯 [MajorLogin] Captured`);

    const options = {
        hostname: TARGET_HOST,
        port: 443,
        path: '/MajorLogin',
        method: 'POST',
        headers: { ...req.headers, host: TARGET_HOST }
    };

    const proxyReq = https.request(options, (proxyRes) => {
        let chunks = [];
        proxyRes.on('data', c => chunks.push(c));
        proxyRes.on('end', () => {
            let buffer = Buffer.concat(chunks);

            try {
                let decoded = LoginResponseMsg.decode(buffer);
                
                decoded.field16 = `\( {MY_IP}: \){TCP_PORT}`;
                decoded.field24 = `\( {MY_IP}: \){TCP_PORT}`;

                if (decoded.field22) {
                    let str = decoded.field22.toString()
                        .replace(/csoversea\.stronghold\.freefiremobile\.com/g, MY_IP)
                        .replace(/\b34\.\d+\.\d+\.\d+\b/g, MY_IP);
                    decoded.field22 = Buffer.from(str);
                }
                if (decoded.field23) {
                    let str = decoded.field23.toString()
                        .replace(/csoversea\.stronghold\.freefiremobile\.com/g, MY_IP)
                        .replace(/\b34\.\d+\.\d+\.\d+\b/g, MY_IP);
                    decoded.field23 = Buffer.from(str);
                }

                buffer = LoginResponseMsg.encode(decoded).finish();
                console.log("💉 Injection Success");
            } catch (e) {
                console.log("⚠️ Decode failed");
            }

            res.send(buffer);
        });
    });

    proxyReq.on('error', () => res.status(500).send("Error"));
    proxyReq.write(req.rawBody);
    proxyReq.end();
});

// ====================== Catch All Proxy ======================
app.use((req, res, next) => {
    if (req.method === 'POST' && req.path !== '/MajorLogin') {
        console.log(`➡️ Forwarding ${req.path}`);

        const options = {
            hostname: TARGET_HOST,
            port: 443,
            path: req.originalUrl,
            method: 'POST',
            headers: { ...req.headers, host: TARGET_HOST, 'content-length': req.rawBody.length }
        };

        const proxyReq = https.request(options, (proxyRes) => {
            let chunks = [];
            proxyRes.on('data', c => chunks.push(c));
            proxyRes.on('end', () => res.send(Buffer.concat(chunks)));
        });

        proxyReq.on('error', () => res.status(500).send("Error"));
        proxyReq.write(req.rawBody);
        proxyReq.end();
    } else {
        next();
    }
});

// ====================== TCP Proxy ======================
const tcpServer = net.createServer((client) => {
    console.log(`🔥 TCP Client: ${client.remoteAddress}`);

    const target = net.createConnection({ host: TARGET_BATTLE_HOST, port: 7006 });

    client.pipe(target);
    target.pipe(client);

    client.on('error', () => {});
    target.on('error', () => {});
});

tcpServer.listen(TCP_PORT, '0.0.0.0', () => {
    console.log(`🚀 TCP Proxy on ${TCP_PORT}`);
});

// Start Servers
http.createServer(app).listen(HTTP_PORT, '0.0.0.0');
https.createServer(sslOptions, app).listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`🔒 HTTPS Server Running on ${HTTPS_PORT}`);
});
