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

const MY_DOMAIN = 'navivpn.sytes.net';
const MY_IP = '103.6.168.170';
const MY_URL_HTTPS = `https://${MY_DOMAIN}`;
const TARGET_HOST = 'loginbp.ggpolarbear.com'; 

// Protobuf Schema (MajorLoginResponse)
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

app.use((req, res, next) => {
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
        "latest_release_version": "OB53",
        "remote_version": "1.123.8",
        "server_url": `${MY_URL_HTTPS}/`, 
        "country_code": "SG", "client_ip": clientIp,
        "ggp_url": MY_IP, "core_url": MY_IP, "core_ip_list": [MY_IP, "0.0.0.0"]
    };
    res.status(200).json(verData);
});

// 2️⃣ [MajorLogin] - TCP REDIRECTION ONLY
app.post('/MajorLogin', (req, res) => {
    console.log(`\n🎯 [MajorLogin] Injecting TCP Targets...`);
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

                // 🔥 CRITICAL FIX: field10 මාරු කරන්න එපා!
                // TCP IPs විතරක් අපේ එකට හරවමු
                const myTarget = `${MY_IP}:${TCP_PORT}`;
                decoded.field16 = myTarget;
                decoded.field24 = myTarget;

                console.log(`💉 Injected TCP Target: ${myTarget}`);

                const modifiedBuffer = LoginResponseMsg.encode(LoginResponseMsg.create(decoded)).finish();
                res.setHeader('Content-Type', 'application/octet-stream');
                res.send(modifiedBuffer);
            } catch (err) {
                res.status(500).send("");
            }
        });
    });
    proxyReq.write(req.rawBody);
    proxyReq.end();
});

// 🔄 [Catch-All Proxy]
// 🔄 [Catch-All Proxy - With Data Capture]
// 🔄 [Catch-All Proxy - GetLoginData Sniper]
app.all(/.*/, (req, res) => {
    if (req.url.includes('/MajorLogin') || req.url.includes('/ver.php')) return;

    let finalTarget = TARGET_HOST;
    if (req.url.includes('Account') || req.url.includes('GetLoginData')) {
        finalTarget = 'clientbp.ggpolarbear.com';
    }

    const options = {
        hostname: finalTarget,
        port: 443,
        path: req.url,
        method: req.method,
        headers: { ...req.headers, 'host': finalTarget }
    };

    const proxyReq = https.request(options, (proxyRes) => {
        const resChunks = [];
        proxyRes.on('data', chunk => resChunks.push(chunk));
        proxyRes.on('end', () => {
            let buffer = Buffer.concat(resChunks);
            
            // 🎯 GetLoginData එක අහු වුණාම කරන සෙල්ලම
            if (req.url.includes('GetLoginData')) {
                console.log(`\n📦 [GetLoginData] Data Length: ${buffer.length} bytes`);
                
                // අපි බලමු මේ buffer එක අස්සේ ගරේනාගේ පරණ IP එක (34.87... වගේ ඒවා) තියෙනවද කියලා
                // තිබුණොත් ඒ හැම තැනම අපේ IP එක බලෙන් ඔබමු
                let hexString = buffer.toString('hex');
                
                // උඹේ ලොග් එකේ කලින් තිබුණ IP එකක්: 34.126.76.45 (Hex: 32342e3132362e37362e3435)
                // මේකේ strings විදිහට IPs තියෙනවා නම් හොයන්න ලේසියි
                const dataString = buffer.toString('utf-8');
                if (dataString.includes('freefiremobile.com') || dataString.includes('34.')) {
                    console.log("⚠️ [Found] Garena IPs/Domains in GetLoginData!");
                    
                    // Brute-force replacement (පරිස්සමෙන් කරන්න ඕනේ)
                    // මේකෙන් වෙන්නේ buffer එක අස්සේ තියෙන ඕනෑම "34." වලින් පටන් ගන්න IP එකක් අපේ එකට මාරු කරන එක
                    // හැබැයි structure එක කැඩෙන්න පුළුවන් නිසා අපි ඉස්සෙල්ලා ලොග් එක බලමු.
                }
                
                console.log(`📝 GetLoginData HEX: ${hexString.substring(0, 300)}`);
            }

            Object.keys(proxyRes.headers).forEach(key => res.setHeader(key, proxyRes.headers[key]));
            res.status(proxyRes.statusCode).send(buffer);
        });
    });

    proxyReq.on('error', () => res.status(500).send(""));
    if (req.rawBody) proxyReq.write(req.rawBody);
    proxyReq.end();
});



// 3️⃣ [TCP Server]
const tcpServer = net.createServer((socket) => {
    console.log(`\n🔥 [TCP] GAME CONNECTED! 🔥`);
    socket.on('data', (data) => socket.write(data));
    socket.on('error', (err) => console.log(`[TCP Error] ${err.message}`));
});

tcpServer.listen(TCP_PORT, '0.0.0.0');
http.createServer(app).listen(HTTP_PORT, '0.0.0.0');
https.createServer(sslOptions, app).listen(HTTPS_PORT, '0.0.0.0');
console.log(`✅ Proxy Ready. Go to Lobby and wait for TCP Connection...`);
