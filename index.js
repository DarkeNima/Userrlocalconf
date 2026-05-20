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
    console.log('✅ SSL Certificates loaded');
} catch (err) {
    console.error('❌ SSL Error:', err.message);
    process.exit(1);
}

// Raw Body Capture Middleware
app.use((req, res, next) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => { req.rawBody = Buffer.concat(chunks); next(); });
});

// 1️⃣ [ver.php]
app.get('/ver.php', (req, res) => {
    const clientIp = req.ip.replace('::ffff:', '');
    const verData = {
        "code": 0,
        "is_server_open": true,
        "latest_release_version": "OB53",
        "server_url": `${MY_URL_HTTPS}/`, 
        "ggp_url": MY_IP,
        "core_url": MY_IP,
        "core_ip_list": [MY_IP, "0.0.0.0"]
    };
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(verData);
    console.log(`✅ ver.php sent to ${clientIp}`);
});

// 2️⃣ [MajorLogin] - LIVE INJECTION
app.post('/MajorLogin', (req, res) => {
    console.log(`\n🎯 [MajorLogin] Captured! Forwarding to Garena...`);

    const options = {
        hostname: TARGET_HOST,
        port: 443,
        path: '/MajorLogin',
        method: 'POST',
        headers: { ...req.headers, 'host': TARGET_HOST, 'content-length': req.rawBody.length }
    };

    const proxyReq = https.request(options, (proxyRes) => {
        const resChunks = [];
        proxyRes.on('data', chunk => resChunks.push(chunk));
        proxyRes.on('end', () => {
            const originalBuffer = Buffer.concat(resChunks);
            console.log(`[←] Received Official Data (${originalBuffer.length} bytes)`);

            try {
                const decoded = LoginResponseMsg.decode(originalBuffer);
                
                // IP Injection
                decoded.field16 = MY_IP;
                decoded.field24 = MY_IP;
                console.log(`🛠️ Modified Fields: { f16: ${decoded.field16}, f24: ${decoded.field24} }`);

                // Field 22/23 Replacement
                if (decoded.field22) {
                    let serverList = decoded.field22.toString();
                    serverList = serverList.replace(/csoversea\.stronghold\.freefiremobile\.com/g, MY_IP);
                    serverList = serverList.replace(/\b34\.\d+\.\d+\.\d+\b/g, MY_IP);
                    decoded.field22 = Buffer.from(serverList);
                    console.log("💉 Replaced server list in field22");
                }

                if (decoded.field23) {
                    let serverList2 = decoded.field23.toString();
                    serverList2 = serverList2.replace(/csoversea\.stronghold\.freefiremobile\.com/g, MY_IP);
                    serverList2 = serverList2.replace(/\b34\.\d+\.\d+\.\d+\b/g, MY_IP);
                    decoded.field23 = Buffer.from(serverList2);
                    console.log("💉 Replaced server list in field23");
                }

                const modifiedBuffer = LoginResponseMsg.encode(LoginResponseMsg.create(decoded)).finish();
                res.send(modifiedBuffer);
                console.log("✅ Full injection done!");

            } catch (err) {
                console.error("❌ Decode failed:", err.message);
                res.send(originalBuffer);
            }
        });
    });

    proxyReq.on('error', (err) => {
        console.error("❌ Proxy Error:", err.message);
        res.status(500).send("Proxy Error");
    });

    proxyReq.write(req.rawBody);
    proxyReq.end();
});

// 3️⃣ [Unknown Request Catch-all] - ලොබි එකේදී එන ඕනෑම HTTPS රික්වෙස්ට් එකක් අල්ලන්න
 // 3️⃣ [Unknown Request Catch-all] - Express 5+ වලදී '*' වෙනුවට '(.*)' පාවිච්චි කරන්න

// 3️⃣ [Unknown Request Catch-all] 
// Routes වලට පස්සේ මේක දාන්න. එතකොට අනිත් ඒවට අහු නොවන ඔක්කොම මෙතනට එනවා.
app.use((req, res, next) => {
    // මේක MajorLogin හෝ ver.php නෙවෙයි නම් විතරක් ලොග් කරමු
    if (req.url !== '/ver.php' && req.url !== '/MajorLogin') {
        console.log(`\n📡 [Unknown Request] ${req.method} ${req.url}`);
        console.log(`   Headers: ${JSON.stringify(req.headers)}`);
        
        if (req.rawBody && req.rawBody.length > 0) {
            console.log(`   Body Length: ${req.rawBody.length} bytes`);
        }
        return res.status(404).send("Not Found");
    }
    next();
});

    
// 4️⃣ [TCP Server]
const tcpServer = net.createServer((socket) => {
    console.log(`\n🔥 [TCP] Game Client Connected: ${socket.remoteAddress}`);
    socket.on('data', (data) => {
        console.log(`[TCP] Received: ${data.length} bytes from client`);
    });
    socket.on('close', () => console.log(`[TCP] Connection Closed`));
    socket.on('error', (err) => console.log(`[TCP] Error: ${err.message}`));
});

tcpServer.listen(TCP_PORT, '0.0.0.0', () => console.log(`🚀 TCP Server on Port ${TCP_PORT}`));

// Start Servers
http.createServer(app).listen(HTTP_PORT, '0.0.0.0', () => console.log(`🌐 HTTP on ${HTTP_PORT}`));
https.createServer(sslOptions, app).listen(HTTPS_PORT, '0.0.0.0', () => console.log(`🔒 HTTPS on ${HTTPS_PORT}`));
