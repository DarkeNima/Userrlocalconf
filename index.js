const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const net = require('net');
const protobuf = require('protobufjs');
const zlib = require('zlib');
// මේක උඩින්ම දාන්න (පරණ https-proxy-agent එක වෙනුවට)
const { SocksProxyAgent } = require('socks-proxy-agent');

// Realme V3 Proxy Setup (Tailscale IP)
const proxyUrl = 'socks5://100.117.207.88:1080'; 
const proxyAgent = new SocksProxyAgent(proxyUrl);

const app = express();
const HTTP_PORT = 80;
const HTTPS_PORT = 443;
const TCP_PORT = 7006;

const MY_DOMAIN = 'navivpn.sytes.net';
const MY_IP = '103.6.168.170';
const MY_URL_HTTPS = `https://${MY_DOMAIN}`;

// ✅ 1. Realme V3 Proxy Setup (Tailscale IP)
const proxyUrl = 'socks5://100.117.207.88:1080'; 
const proxyAgent = new HttpsProxyAgent(proxyUrl);

// 🛑 2. Protobuf Schema
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

// 🔒 3. SSL Certificates
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

app.use(express.json());

// ─── 🛠️ Manual Body Collector ──────────────────────────────────────
function collectRawBody(req, maxBytes = 2 * 1024 * 1024) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let totalBytes = 0;
        req.on('data', (chunk) => {
            totalBytes += chunk.length;
            if (totalBytes > maxBytes) { req.destroy(); return reject(new Error('Payload too large')); }
            chunks.push(chunk);
        });
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

// 🌐 4. ver.php
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
        "remote_version": "1.123.8", "server_url": `${MY_URL_HTTPS}/`, 
        "country_code": "SG", "client_ip": clientIp, "ggp_url": MY_IP, "core_url": MY_IP, "core_ip_list": [MY_IP, "0.0.0.0"]
    };
    res.json(verData);
    console.log(`✅ [ver.php] sent to ${clientIp}`);
});

// 🎯 5. MajorLogin (NATIVE NODE.JS RELAY via REALME PROXY)
app.post('/MajorLogin', async (req, res) => {
    console.log(`\n🔄 [MajorLogin] Capturing Stream...`);
    
    try {
        const rawBody = await collectRawBody(req);
        if (rawBody.length === 0) return res.status(200).send(Buffer.alloc(0));

        console.log(`📦 Captured ${rawBody.length} bytes. Relaying via Realme V3...`);

        // Remote Request Options (Android Chrome 120 Fingerprint)
        const options = {
            hostname: 'loginbp.ggpolarbear.com',
            port: 443,
            path: '/MajorLogin',
            method: 'POST',
            agent: proxyAgent, // ✅ Uses Realme V3 Mobile Data
            headers: {
                'host': 'loginbp.ggpolarbear.com',
                'content-length': String(rawBody.length),
                'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                'sec-ch-ua-mobile': '?1',
                'sec-ch-ua-platform': '"Android"',
                'user-agent': "Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
                'accept': '*/*',
                'origin': 'null',
                'sec-fetch-site': 'cross-site',
                'sec-fetch-mode': 'cors',
                'sec-fetch-dest': 'empty',
                'accept-encoding': 'gzip, deflate, br',
                'accept-language': 'en-US,en;q=0.9',
                'content-type': 'application/octet-stream'
            },
            timeout: 30000
        };

        const remoteReq = https.request(options, (remoteRes) => {
            let chunks = [];
            remoteRes.on('data', (d) => chunks.push(d));
            remoteRes.on('end', () => {
                let responseBuffer = Buffer.concat(chunks);
                
                // Decompress Gzip if needed
                const encoding = remoteRes.headers['content-encoding'];
                if (encoding === 'gzip') {
                    responseBuffer = zlib.gunzipSync(responseBuffer);
                } else if (encoding === 'br') {
                    responseBuffer = zlib.brotliDecompressSync(responseBuffer);
                }

                if (remoteRes.statusCode === 200) {
                    try {
                        const decoded = LoginResponseMsg.decode(responseBuffer);
                        console.log(`✅ Success! Garena ID: ${decoded.field1}`);

                        // 🛠️ Patching Data
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
                } else {
                    console.error(`❌ Garena 503/Blocked! Status: ${remoteRes.statusCode}`);
                    res.status(200).send(Buffer.alloc(0));
                }
            });
        });

        remoteReq.on('error', (e) => {
            console.error(`❌ Relay Error: ${e.message}`);
            res.status(200).send(Buffer.alloc(0));
        });

        remoteReq.write(rawBody);
        remoteReq.end();

    } catch (err) {
        console.error(`❌ Fatal Error: ${err.message}`);
        res.status(200).send(Buffer.alloc(0));
    }
});

app.post('/Ping', (req, res) => res.send("OK"));
app.all('/*splat', (req, res) => res.send("OK"));

// ⚡ 6. Servers
const tcpServer = net.createServer((socket) => {
    console.log(`\n🎮 [TCP] Client: ${socket.remoteAddress}`);
    socket.on('data', (d) => console.log(`[TCP] Received: ${d.length} bytes`));
});

tcpServer.listen(TCP_PORT, '0.0.0.0');
http.createServer(app).listen(HTTP_PORT, '0.0.0.0');
https.createServer(sslOptions, app).listen(HTTPS_PORT, '0.0.0.0');

console.log(`\n🔥 SERVER ACTIVE - REALME V3 PROXY MODE`);
