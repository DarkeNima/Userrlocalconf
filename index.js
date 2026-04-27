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
// 1. Load REAL SSL certificates from Let's Encrypt
// ─────────────────────────────────────────────────────────
let sslOptions;
try {
    sslOptions = {
        key: fs.readFileSync('/etc/letsencrypt/live/navidu-ff.duckdns.org/privkey.pem'),
        cert: fs.readFileSync('/etc/letsencrypt/live/navidu-ff.duckdns.org/fullchain.pem')
    };
    console.log('✅ REAL Let\'s Encrypt SSL certificates loaded successfully');
} catch (err) {
    console.error('❌ Failed to load SSL certificates:', err.message);
    process.exit(1);
}

// ─────────────────────────────────────────────────────────
// 2. Middleware & Logging
// ─────────────────────────────────────────────────────────
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: true, verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(express.raw({ type: '*/*', limit: '10mb', verify: (req, res, buf) => { req.rawBody = buf; } }));

function getBodyPreview(req) {
    if (!req.rawBody) return '(empty)';
    const raw = req.rawBody.toString('utf8');
    return raw.length > 1000 ? raw.substring(0, 1000) + '...' : raw;
}

app.use((req, res, next) => {
    const protocol = req.secure ? 'HTTPS' : 'HTTP';
    console.log(`\n🚨 [${protocol}] REQUEST: ${req.method} ${req.path}`);
    
    const originalSend = res.send;
    let responseBody = null;
    res.send = function(body) { responseBody = body; originalSend.call(this, body); };

    res.on('finish', () => {
        if (req.path.includes('login') || req.path.includes('MajorLogin') || req.method === 'POST') {
            console.log(`🔁 [RESPONSE] ${req.path} - Status: ${res.statusCode}`);
            if (responseBody) {
                const bodyStr = Buffer.isBuffer(responseBody) ? responseBody.toString('utf8') : String(responseBody);
                console.log(`📨 Body:\n${bodyStr.substring(0, 2000)}`);
            }
        }
    });
    next();
});

const axiosInstance = axios.create({
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
});

// ─────────────────────────────────────────────────────────
// 3. Handlers
// ─────────────────────────────────────────────────────────

// ver.php rewrite
app.get('/ver.php', async (req, res) => {
    try {
        const response = await axiosInstance({
            method: 'GET',
            url: `${TARGET_VER_PHP}/ver.php?${new URLSearchParams(req.query).toString()}`,
            headers: { ...req.headers, host: 'version.astutech.online' },
            responseType: 'text'
        });

        let body = response.data;
        body = body.replace(/version\.astutech\.online/g, MY_DOMAIN);
        body = body.replace(/srv0010\.astutech\.online/g, MY_DOMAIN);

        res.status(response.status).send(body);
        console.log(`✅ ver.php rewritten to HTTPS`);
    } catch (error) {
        res.status(502).send('Error');
    }
});

// Proxy All
app.use(async (req, res) => {
    if (req.path === '/ver.php') return;
    try {
        const response = await axiosInstance({
            method: req.method,
            url: `${TARGET_API}${req.path}`,
            headers: { ...req.headers, host: 'srv0010.astutech.online' },
            data: req.rawBody,
            responseType: 'arraybuffer',
            validateStatus: () => true
        });

        res.status(response.status);
        Object.entries(response.headers).forEach(([k, v]) => res.setHeader(k, v));
        res.send(response.data);
    } catch (error) {
        res.status(502).send('Proxy Error');
    }
});

// ─────────────────────────────────────────────────────────
// 4. Servers
// ─────────────────────────────────────────────────────────
http.createServer(app).listen(HTTP_PORT, '0.0.0.0');
https.createServer(sslOptions, app).listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`🌐 Proxy running on 80 & 443`);
    console.log(`🚀 Ready to capture Login JSON!`);
});

const tcpServer = net.createServer((s) => {
    s.on('data', (d) => console.log(`📩 TCP Data: ${d.length} bytes`));
});
tcpServer.listen(7006, '0.0.0.0');
