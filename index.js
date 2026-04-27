const express = require('express');
const axios = require('axios');
const net = require('net');
const https = require('https');
const http = require('http');
const fs = require('fs');
const app = express();

const HTTP_PORT = 80;
const HTTPS_PORT = 443;

const MY_DOMAIN = 'navidu-ff.duckdns.org';
const MY_URL_HTTPS = `https://${MY_DOMAIN}`;
const TARGET_VER_PHP = 'https://version.astutech.online';
const TARGET_API = 'https://srv0010.astutech.online';

// ─────────────────────────────────────────────────────────
// 🛠️ SSL Certificates (Certbot Paths)
// ─────────────────────────────────────────────────────────
let sslOptions;
try {
    sslOptions = {
        key: fs.readFileSync(`/etc/letsencrypt/live/${MY_DOMAIN}/privkey.pem`),
        cert: fs.readFileSync(`/etc/letsencrypt/live/${MY_DOMAIN}/fullchain.pem`)
    };
    console.log('✅ SSL certificates (Let\'s Encrypt) loaded successfully');
} catch (err) {
    console.error('❌ Failed to load SSL certificates:', err.message);
    process.exit(1);
}

// Middleware to capture raw body
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: true, verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(express.raw({ type: '*/*', limit: '10mb', verify: (req, res, buf) => { req.rawBody = buf; } }));

// Logging logic
app.use((req, res, next) => {
    const protocol = req.secure ? 'HTTPS' : 'HTTP';
    console.log(`\n🚨 [${protocol}] REQUEST: ${req.method} ${req.path}`);
    next();
});

const axiosInstance = axios.create({
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
});

function forwardHeaders(originalHeaders) {
    const headers = { ...originalHeaders };
    delete headers.host;
    delete headers['content-length'];
    return headers;
}

// 1. /ver.php Proxy & Rewrite
app.get('/ver.php', async (req, res) => {
    console.log(`🔧 [VER.PHP] Rewriting for domain: ${MY_DOMAIN}`);
    try {
        const queryString = new URLSearchParams(req.query).toString();
        const response = await axiosInstance({
            method: 'GET',
            url: `${TARGET_VER_PHP}/ver.php?${queryString}`,
            headers: forwardHeaders(req.headers),
            responseType: 'text'
        });

        let modifiedBody = response.data;
        modifiedBody = modifiedBody.replace(/version\.astutech\.online/g, MY_DOMAIN);
        modifiedBody = modifiedBody.replace(/srv0010\.astutech\.online/g, MY_DOMAIN);

        res.status(response.status).send(modifiedBody);
    } catch (error) {
        console.error('❌ /ver.php error:', error.message);
        res.status(502).send('Error');
    }
});

// 2. Catch-all Proxy
// Catch-all Proxy (Express 5.0+ සඳහා නිවැරදි ක්‍රමය)
app.all('/:path*', async (req, res) => {
    // /ver.php එකට මේක අදාළ කරගන්න එපා (ඒක උඩින් handle වෙන නිසා)
    if (req.path === '/ver.php') return;
    
    console.log(`🔄 [PROXY] Forwarding: ${req.path}`);
    try {
        const response = await axiosInstance({
            method: req.method,
            url: `${TARGET_API}${req.path}`,
            headers: forwardHeaders(req.headers),
            data: req.rawBody,
            responseType: 'arraybuffer'
        });

        if (req.path.includes('login') || req.method === 'POST') {
            console.log(`📡 Response Received from Astute (Status: ${response.status})`);
        }

        res.status(response.status).send(response.data);
    } catch (error) {
        console.error(`❌ Proxy Error: ${error.message}`);
        res.status(502).send('Proxy Error');
    }
});


// 3. Servers Start
http.createServer(app).listen(HTTP_PORT, '0.0.0.0');
https.createServer(sslOptions, app).listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`🚀 PROXY READY ON 80 & 443`);
});
