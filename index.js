const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const app = express();
const HTTP_PORT = 80;
const HTTPS_PORT = 443;

// ⚙️ Configuration
const MY_DOMAIN = 'navivpn.sytes.net';
const MY_IP = '103.6.168.170';
const MY_URL_HTTPS = `https://${MY_DOMAIN}`;
const TARGET_HOST = 'loginbp.ggpolarbear.com'; // Real Server එක
const LOG_DIR = path.join(__dirname, 'logs');

// Logs ෆෝල්ඩරය සෑදීම
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

// 🔒 SSL Certificates (Let's Encrypt)
let sslOptions;
try {
    sslOptions = {
        key: fs.readFileSync(`/etc/letsencrypt/live/${MY_DOMAIN}/privkey.pem`),
        cert: fs.readFileSync(`/etc/letsencrypt/live/${MY_DOMAIN}/fullchain.pem`)
    };
    console.log('✅ SSL Certificates loaded successfully');
} catch (err) {
    console.error('❌ SSL Error: Make sure Let\'s Encrypt is set up correctly!');
    process.exit(1);
}

// 📦 Raw Body Parser (Binary/Protobuf Capture සඳහා)
app.use((req, res, next) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
        req.rawBody = Buffer.concat(chunks);
        next();
    });
});

// 1️⃣ [ver.php] - ගේම් එකේ Traffic එක අපේ VPS එකට හරවන තැන
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

// 2️⃣ [MajorLogin] - Direct Forwarding & Binary Logging
app.post('/MajorLogin', (req, res) => {
    const timestamp = Date.now();
    console.log(`\n🎯 [MajorLogin] Intercepted! Size: ${req.rawBody.length} bytes`);

    // ✅ STEP 1: Game එක එවන Request එක සේව් කිරීම (.bin file)
    const reqPath = path.join(LOG_DIR, `req_${timestamp}.bin`);
    fs.writeFileSync(reqPath, req.rawBody);
    console.log(`[→] Game Request Saved: ${reqPath}`);

    // ✅ STEP 2: Real Server එකට Direct Forward කිරීම
    const options = {
        hostname: TARGET_HOST,
        port: 443,
        path: '/MajorLogin',
        method: 'POST',
        headers: {
            ...req.headers,
            'host': TARGET_HOST, // Host එක අනිවාර්යයෙන්ම target එකට මාරු කරන්න ඕනේ
            'content-length': req.rawBody.length
        },
        timeout: 30000
    };

    const proxyReq = https.request(options, (proxyRes) => {
        const resChunks = [];

        proxyRes.on('data', chunk => resChunks.push(chunk));
        
        proxyRes.on('end', () => {
            const responseBody = Buffer.concat(resChunks);

            // ✅ STEP 3: Real Server එකෙන් එවන Response එක සේව් කිරීම (.bin file)
            const resPath = path.join(LOG_DIR, `res_${timestamp}.bin`);
            fs.writeFileSync(resPath, responseBody);
            console.log(`[←] Server Response Saved: Status ${proxyRes.statusCode} | ${responseBody.length} bytes`);

            // Game එකට Response එක යැවීම
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            res.end(responseBody);
            console.log(`✅ Forwarding Complete.`);
        });
    });

    proxyReq.on('error', (err) => {
        console.error('❌ Forwarding Error:', err.message);
        res.status(502).send('Gateway Error');
    });

    // Game එකෙන් ආපු raw body එක real server එකට ලියනවා
    proxyReq.write(req.rawBody);
    proxyReq.end();
});

// 3️⃣ [Ping & Others]
app.post('/Ping', (req, res) => res.send("OK"));
app.all('/*', (req, res) => res.send("OK"));

// 🚀 Servers Start කිරීම
http.createServer(app).listen(HTTP_PORT, '0.0.0.0', () => console.log(`🌐 HTTP Logger on port ${HTTP_PORT}`));
https.createServer(sslOptions, app).listen(HTTPS_PORT, '0.0.0.0', () => console.log(`🔒 HTTPS Logger on port ${HTTPS_PORT}`));

console.log(`\n🔥 DIRECT LOGGING SYSTEM ACTIVE (No Relay Mode)`);
console.log(`📁 Logs Folder: ${LOG_DIR}`);
