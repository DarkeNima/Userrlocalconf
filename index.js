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
const TARGET_HOST = 'loginbp.ggpolarbear.com'; 
const LOG_DIR = path.join(__dirname, 'logs');

if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

// 🔒 SSL Certificates
let sslOptions;
try {
    sslOptions = {
        key: fs.readFileSync(`/etc/letsencrypt/live/${MY_DOMAIN}/privkey.pem`),
        cert: fs.readFileSync(`/etc/letsencrypt/live/${MY_DOMAIN}/fullchain.pem`)
    };
    console.log('✅ SSL Certificates loaded successfully');
} catch (err) {
    console.error('❌ SSL Error:', err.message);
    process.exit(1);
}

// 📦 Raw Body Parser
app.use((req, res, next) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
        req.rawBody = Buffer.concat(chunks);
        next();
    });
});

// 1️⃣ [ver.php] - Fixed
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

// 2️⃣ [MajorLogin]
app.post('/MajorLogin', (req, res) => {
    const timestamp = Date.now();
    console.log(`\n🎯 [MajorLogin] Intercepted! Size: ${req.rawBody.length} bytes`);

    const reqPath = path.join(LOG_DIR, `req_${timestamp}.bin`);
    fs.writeFileSync(reqPath, req.rawBody);

    const options = {
        hostname: TARGET_HOST,
        port: 443,
        path: '/MajorLogin',
        method: 'POST',
        headers: {
            ...req.headers,
            'host': TARGET_HOST,
            'content-length': req.rawBody.length
        },
        timeout: 30000
    };

    const proxyReq = https.request(options, (proxyRes) => {
        const resChunks = [];
        proxyRes.on('data', chunk => resChunks.push(chunk));
        proxyRes.on('end', () => {
            const responseBody = Buffer.concat(resChunks);
            const resPath = path.join(LOG_DIR, `res_${timestamp}.bin`);
            fs.writeFileSync(resPath, responseBody);
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            res.end(responseBody);
            console.log(`✅ Forwarding Complete.`);
        });
    });

    proxyReq.on('error', (err) => {
        console.error('❌ Forwarding Error:', err.message);
        res.status(502).send('Gateway Error');
    });

    proxyReq.write(req.rawBody);
    proxyReq.end();
});

// 3️⃣ [Ping & Others]
app.post('/Ping', (req, res) => res.send("OK"));

// ⚠️ මෙන්න මේ කෑල්ල තමයි මම fix කළේ (Wildcard fix)
app.all('*', (req, res) => {
    res.send("OK");
});

// 🚀 Start
http.createServer(app).listen(HTTP_PORT, '0.0.0.0', () => console.log(`🌐 HTTP on ${HTTP_PORT}`));
https.createServer(sslOptions, app).listen(HTTPS_PORT, '0.0.0.0', () => console.log(`🔒 HTTPS on ${HTTPS_PORT}`));
