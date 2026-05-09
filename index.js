const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const net = require('net');
const protobuf = require('protobufjs');
const { spawn } = require('child_process');

const app = express();
const HTTP_PORT = 80;
const HTTPS_PORT = 443;
const TCP_PORT = 7006;

const MY_DOMAIN = 'navivpn.sytes.net';
const MY_IP = '103.6.168.170';
const MY_URL_HTTPS = `https://${MY_DOMAIN}`;

// 🛑 1. Protobuf Schema
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

// 🔒 2. SSL Certificates
let sslOptions;
try {
    sslOptions = {
        key: fs.readFileSync(`/etc/letsencrypt/live/${MY_DOMAIN}/privkey.pem`),
        cert: fs.readFileSync(`/etc/letsencrypt/live/${MY_DOMAIN}/fullchain.pem`)
    };
    console.log('✅ SSL loaded successfully');
} catch (err) {
    console.error('❌ SSL error:', err.message);
    process.exit(1);
}

// Middleware - JSON විතරක් ඉතිරි කරලා raw body අයින් කළා (අපි manually ගන්න නිසා)
app.use(express.json());

// ─── 🛠️ Manual Body Collector (Claude's Suggestion) ─────────────────────────
function collectRawBody(req, maxBytes = 2 * 1024 * 1024) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let totalBytes = 0;
        req.on('data', (chunk) => {
            totalBytes += chunk.length;
            if (totalBytes > maxBytes) {
                req.destroy();
                return reject(new Error('Payload too large'));
            }
            chunks.push(chunk);
        });
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
        req.on('aborted', () => reject(new Error('Request aborted')));
    });
}

// 🌐 3. ver.php
app.get('/ver.php', (req, res) => {
    console.log(`\n[VER.PHP] Requested by ${req.ip}`);
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
        "remote_version": "1.123.8", "server_url": `${MY_URL_HTTPS}/`, 
        "is_review_server": false, "use_login_optional_download": true,
        "use_background_download": false, "use_background_download_lobby": false,
        "country_code": "SG", "client_ip": clientIp, "gdpr_version": 0,
        "billboard_cdn_url": "https://dl-tata.freefireind.in/common/OB53/CSH/patchupdate/indhfuHFHf101.ff_extend",
        "ggp_url": MY_IP, "core_url": MY_IP, "core_ip_list": [MY_IP, "0.0.0.0"]
    };
    res.json(verData);
    console.log(`✅ ver.php sent`);
});

// 🎯 4. MajorLogin (Manual Capture + Python Relay)
app.post('/MajorLogin', async (req, res) => {
    console.log(`\n🔄 [MajorLogin] Manually Capturing Stream...`);
    
    try {
        const rawBody = await collectRawBody(req);
        if (rawBody.length === 0) {
            console.error("❌ Empty payload received!");
            return res.status(200).send(Buffer.alloc(0));
        }

        console.log(`📦 Captured ${rawBody.length} bytes. Launching Python Relay...`);

        const python = spawn('python3', ['relay.py']);
        let responseChunks = [];
        let errorOutput = "";

        python.stdin.write(rawBody);
        python.stdin.end();

        python.stdout.on('data', (d) => responseChunks.push(d));
        python.stderr.on('data', (d) => errorOutput += d);

        python.on('close', (code) => {
            if (code !== 0) {
                console.error(`❌ Python Error (Exit ${code}): ${errorOutput}`);
                return res.status(200).send(Buffer.alloc(0));
            }

            const fullBuffer = Buffer.concat(responseChunks);
            try {
                const decoded = LoginResponseMsg.decode(fullBuffer);
                console.log(`✅ Success! Decoded ID: ${decoded.field1}`);

                decoded.field16 = `${MY_IP}:${TCP_PORT}`;
                decoded.field24 = `${MY_IP}:${TCP_PORT}`;
                decoded.field10 = MY_URL_HTTPS;

                const patched = LoginResponseMsg.encode(decoded).finish();
                res.setHeader('Content-Type', 'application/octet-stream');
                res.send(patched);
                console.log(`🚀 Patched Response Sent!`);
            } catch (pErr) {
                console.error(`❌ Decode Error: ${pErr.message}`);
                res.status(200).send(Buffer.alloc(0));
            }
        });

    } catch (err) {
        console.error(`❌ Stream Capture Error: ${err.message}`);
        res.status(200).send(Buffer.alloc(0));
    }
});

app.post('/Ping', (req, res) => res.send("OK"));
app.all('/*splat', (req, res) => res.send("OK"));

// ⚡ 5. Servers
const tcpServer = net.createServer((socket) => {
    console.log(`\n🎮 [TCP] Client: ${socket.remoteAddress}`);
    socket.on('data', (d) => console.log(`[TCP] Received: ${d.length} bytes`));
    socket.on('error', (e) => console.log(`[TCP Error] ${e.message}`));
});

tcpServer.listen(TCP_PORT, '0.0.0.0');
http.createServer(app).listen(HTTP_PORT, '0.0.0.0');
https.createServer(sslOptions, app).listen(HTTPS_PORT, '0.0.0.0');

console.log(`\n🔥 SERVER ACTIVE - MANUAL STREAM MODE`);
