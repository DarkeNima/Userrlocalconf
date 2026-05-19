const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const net = require('net');
const protobuf = require('protobufjs');

const app = express();
const HTTP_PORT = 80;
const HTTPS_PORT = 443;
const TCP_PORT = 7006;

// ⚙️ Configuration
const MY_DOMAIN = 'navivpn.sytes.net';
const MY_IP = '103.6.168.170';
const MY_URL_HTTPS = `https://${MY_DOMAIN}`;
const TARGET_HOST = 'loginbp.ggpolarbear.com'; 
const TARGET_BATTLE_HOST = 'csoversea.stronghold.freefiremobile.com'; // Battle server

// Protobuf (MajorLogin)
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
        Field25Msg: {
            fields: {
                sub1: { type: "string", id: 1 },
                sub2: { type: "uint32", id: 2 },
                sub5: { type: "uint32", id: 5 },
                sub6: { type: "uint32", id: 6 },
                sub7: { type: "uint32", id: 7 }
            }
        }
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
    console.log('✅ SSL Certificates loaded');
} catch (err) {
    console.error('❌ SSL Error:', err.message);
    process.exit(1);
}

// Raw Body
app.use((req, res, next) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => { 
        req.rawBody = Buffer.concat(chunks); 
        next(); 
    });
});

// ==================== ver.php ====================
app.get('/ver.php', (req, res) => {
    const clientIp = req.ip.replace('::ffff:', '');
    const verData = {
        "code": 0,
        "is_server_open": true,
        "is_firewall_open": false,
        "cdn_url": "https://dl-tata.freefireind.in/live/ABHotUpdates/",
        "backup_cdn_url": "https://dl-tata.freefireind.in/live/ABHotUpdates/",
        "abhotupdate_cdn_url": "https://core-tata.freefireind.in/live/ABHotUpdates/",
        "img_cdn_url": "https://dl-tata.freefireind.in/common/",
        "server_url": `${MY_URL_HTTPS}/`,
        "ggp_url": MY_IP,
        "core_url": MY_IP,
        "core_ip_list": [MY_IP, "0.0.0.0"],
        "latest_release_version": "OB53",
        "country_code": "SG",
        "client_ip": clientIp,
        // ... අනිත් values ඔයාට ඕන නම් එකතු කරන්න
    };
    res.json(verData);
    console.log(`✅ ver.php sent to ${clientIp}`);
});

// ==================== MajorLogin with Injection ====================
app.post('/MajorLogin', (req, res) => {
    console.log(`\n🎯 [MajorLogin] Captured!`);

    const options = {
        hostname: TARGET_HOST,
        port: 443,
        path: '/MajorLogin',
        method: 'POST',
        headers: { ...req.headers, host: TARGET_HOST }
    };

    const proxyReq = https.request(options, (proxyRes) => {
        let chunks = [];
        proxyRes.on('data', chunk => chunks.push(chunk));
        proxyRes.on('end', () => {
            let buffer = Buffer.concat(chunks);

            try {
                let decoded = LoginResponseMsg.decode(buffer);
                console.log("✅ Decoded successfully");

                decoded.field16 = `\( {MY_IP}: \){TCP_PORT}`;
                decoded.field24 = `\( {MY_IP}: \){TCP_PORT}`;

                if (decoded.field22) {
                    let str = decoded.field22.toString();
                    str = str.replace(/csoversea\.stronghold\.freefiremobile\.com/g, MY_IP);
                    str = str.replace(/\b34\.\d+\.\d+\.\d+\b/g, MY_IP);
                    decoded.field22 = Buffer.from(str);
                }
                if (decoded.field23) {
                    let str = decoded.field23.toString();
                    str = str.replace(/csoversea\.stronghold\.freefiremobile\.com/g, MY_IP);
                    str = str.replace(/\b34\.\d+\.\d+\.\d+\b/g, MY_IP);
                    decoded.field23 = Buffer.from(str);
                }

                buffer = LoginResponseMsg.encode(decoded).finish();
                console.log("💉 Injection Successful!");
            } catch (e) {
                console.log("⚠️ Decode failed, sending original");
            }

            res.send(buffer);
        });
    });

    proxyReq.on('error', e => {
        console.error("Proxy Error:", e.message);
        res.status(500).send("Error");
    });

    proxyReq.write(req.rawBody);
    proxyReq.end();
});

// ==================== General Proxy for all other requests ====================
app.post('/*', (req, res) => {
    const path = req.originalUrl;
    console.log(`➡️ [${path}] Forwarding to Garena...`);

    const options = {
        hostname: TARGET_HOST,
        port: 443,
        path: path,
        method: 'POST',
        headers: { ...req.headers, host: TARGET_HOST }
    };

    const proxyReq = https.request(options, (proxyRes) => {
        let chunks = [];
        proxyRes.on('data', c => chunks.push(c));
        proxyRes.on('end', () => {
            res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'application/octet-stream');
            res.status(proxyRes.statusCode || 200).send(Buffer.concat(chunks));
            console.log(`⬅️ [\( {path}] Response sent ( \){Buffer.concat(chunks).length} bytes)`);
        });
    });

    proxyReq.write(req.rawBody);
    proxyReq.end();
});

// ==================== Better TCP Battle Proxy ====================
const tcpServer = net.createServer((client) => {
    console.log(`🔥 [TCP] Client Connected: \( {client.remoteAddress}: \){client.remotePort}`);

    const target = net.createConnection({
        host: TARGET_BATTLE_HOST,
        port: 7006
    });

    client.pipe(target);
    target.pipe(client);

    client.on('error', (err) => console.log(`[TCP Client Error] ${err.message}`));
    target.on('error', (err) => console.log(`[TCP Target Error] ${err.message}`));
    client.on('close', () => target.destroy());
    target.on('close', () => client.destroy());
});

tcpServer.listen(TCP_PORT, '0.0.0.0', () => {
    console.log(`🚀 TCP Battle Proxy running on port ${TCP_PORT}`);
});

// Start Servers
http.createServer(app).listen(HTTP_PORT, '0.0.0.0', () => console.log(`🌐 HTTP on ${HTTP_PORT}`));
https.createServer(sslOptions, app).listen(HTTPS_PORT, '0.0.0.0', () => console.log(`🔒 HTTPS on ${HTTPS_PORT}`));
