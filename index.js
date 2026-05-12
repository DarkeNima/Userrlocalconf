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

// ⚙️ Configuration
const MY_DOMAIN = 'navivpn.sytes.net';
const MY_IP = '103.6.168.170';
const MY_URL_HTTPS = `https://${MY_DOMAIN}`;
const TARGET_HOST = 'loginbp.ggpolarbear.com'; 

// Protobuf Schema
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

// SSL Certificates
let sslOptions;
try {
    sslOptions = {
        key: fs.readFileSync(`/etc/letsencrypt/live/${MY_DOMAIN}/privkey.pem`),
        cert: fs.readFileSync(`/etc/letsencrypt/live/${MY_DOMAIN}/fullchain.pem`)
    };
    console.log('✅ SSL Certificates loaded.');
} catch (err) {
    console.error('❌ SSL Error:', err.message);
    process.exit(1);
}

// Global Logging & Raw Body Capture
app.use((req, res, next) => {
    console.log(`\n🌐 [${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => { req.rawBody = Buffer.concat(chunks); next(); });
});

// 1️⃣ [ver.php]
app.get('/ver.php', (req, res) => {
    const clientIp = req.ip.replace('::ffff:', '');
    const verData = {
        "code": 0, "is_server_open": true, "is_firewall_open": false,
        "cdn_url": "https://dl-tata.freefireind.in/live/ABHotUpdates/",
        "backup_cdn_url": "https://dl-tata.freefireind.in/live/ABHotUpdates/",
        "abhotupdate_cdn_url": "https://core-tata.freefireind.in/live/ABHotUpdates/",
        "img_cdn_url": "https://dl-tata.freefireind.in/common/",
        "login_download_optionalpack": "optionalclothres:shaders|optionalpetres:optionalpetres_commonab_shader|optionallobbyres:",
        "need_track_hotupdate": true, "abhotupdate_check": "cache_res;assetindexer;SH-Gpp",
        "latest_release_version": "OB53", "min_hint_size": 1, "space_required_in_GB": 1.48,
        "should_check_ab_load": false, "force_refresh_restype": "optionalavatarres",
        "remote_version": "1.123.8",
        "server_url": `${MY_URL_HTTPS}/`, 
        "is_review_server": false, "use_login_optional_download": true,
        "use_background_download": false, "use_background_download_lobby": false,
        "country_code": "SG", "client_ip": clientIp, "gdpr_version": 0,
        "billboard_cdn_url": "https://dl-tata.freefireind.in/common/OB53/CSH/patchupdate/indhfuHFHf101.ff_extend",
        "ggp_url": MY_IP, "core_url": MY_IP, "core_ip_list": [MY_IP, "0.0.0.0"]
    };
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(verData);
});

// 2️⃣ [MajorLogin]
app.post('/MajorLogin', (req, res) => {
    console.log(`🎯 [MajorLogin] Modifying for Injection...`);
    const options = {
        hostname: TARGET_HOST, port: 443, path: '/MajorLogin', method: 'POST',
        headers: { ...req.headers, 'host': TARGET_HOST, 'content-length': req.rawBody.length }
    };
    const proxyReq = https.request(options, (proxyRes) => {
        const resChunks = [];
        proxyRes.on('data', chunk => resChunks.push(chunk));
        proxyRes.on('end', () => {
            try {
                const originalBuffer = Buffer.concat(resChunks);
                const decoded = LoginResponseMsg.decode(originalBuffer);
                // BigInt තියෙන නිසා JSON.stringify එකට මේ විදිහට දාන්න ඕනේ
console.log("🔍 [Full Decoded Data]:", JSON.stringify(decoded, (key, value) => 
    typeof value === 'bigint' ? value.toString() : value, 2));

                decoded.field16 = `${MY_IP}:${TCP_PORT}`;
                decoded.field24 = `${MY_IP}:${TCP_PORT}`;
                const modifiedBuffer = LoginResponseMsg.encode(LoginResponseMsg.create(decoded)).finish();
                res.setHeader('Content-Type', 'application/octet-stream');
                res.send(modifiedBuffer);
                console.log(`💉 Injected TCP Target: ${decoded.field16}`);
            } catch (err) { res.status(500).send(""); }
        });
    });
    proxyReq.write(req.rawBody);
    proxyReq.end();
});

// 🔄 [Catch-All Proxy] - FIX: Use '(.*)' for Express 5 catch-all
// 🔄 [Catch-All Proxy] - ඕනෑම Request එකක් අල්ලගන්න Regex පාවිච්චි කරමු
app.all(/.*/, (req, res) => {
    // මේ ලයින් එක අනිවාර්යයි, නැත්නම් ලූප් එකක් වෙන්න පුළුවන්
    if (req.url.includes('/MajorLogin') || req.url.includes('/ver.php')) return;

    console.log(`➡️ [Forwarding] ${req.url} to Garena Server`);
    
    const options = {
        hostname: TARGET_HOST,
        port: 443,
        path: req.url,
        method: req.method,
        headers: { 
            ...req.headers, 
            'host': TARGET_HOST, 
            'content-length': req.rawBody ? req.rawBody.length : 0 
        }
    };

    const proxyReq = https.request(options, (proxyRes) => {
        const resChunks = [];
        proxyRes.on('data', chunk => resChunks.push(chunk));
        proxyRes.on('end', () => {
            const buffer = Buffer.concat(resChunks);
            Object.keys(proxyRes.headers).forEach(key => res.setHeader(key, proxyRes.headers[key]));
            res.status(proxyRes.statusCode).send(buffer);
            console.log(`✅ [${req.url}] Success (${buffer.length} bytes)`);
        });
    });

    proxyReq.on('error', err => {
        console.log(`❌ Proxy Error [${req.url}]: ${err.message}`);
        res.status(500).send("");
    });
    
    if (req.rawBody) proxyReq.write(req.rawBody);
    proxyReq.end();
});



// 3️⃣ [TCP Server - Kit Unlocker]
const tcpServer = net.createServer((socket) => {
    const remoteAddr = socket.remoteAddress;
    console.log(`\n🔥 [TCP] GAME CONNECTED! Client: ${remoteAddr} 🔥`);
    
    socket.on('data', (data) => {
        console.log(`📦 [TCP Data] ${data.length} bytes received`);
        socket.write(data); 
    });

    socket.on('close', () => console.log(`[TCP] Closed: ${remoteAddr}`));
    socket.on('error', (err) => console.log(`[TCP Error] ${err.message}`));
});

tcpServer.listen(TCP_PORT, '0.0.0.0', () => console.log(`🚀 TCP Server (Kit Unlocker) on ${TCP_PORT}`));
http.createServer(app).listen(HTTP_PORT, '0.0.0.0');
https.createServer(sslOptions, app).listen(HTTPS_PORT, '0.0.0.0');
console.log(`✅ Proxy Ready & Monitoring...`);
