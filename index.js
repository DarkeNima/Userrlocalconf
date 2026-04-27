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
const TARGET_VER_PHP = 'https://version.astutech.online';
const TARGET_API = 'https://srv0010.astutech.online';

// 1. SSL Certificates (Let's Encrypt)
let sslOptions;
try {
    sslOptions = {
        key: fs.readFileSync('/etc/letsencrypt/live/navidu-ff.duckdns.org/privkey.pem'),
        cert: fs.readFileSync('/etc/letsencrypt/live/navidu-ff.duckdns.org/fullchain.pem')
    };
    console.log('✅ REAL SSL Certificates loaded!');
} catch (err) {
    console.error('❌ SSL Load Error:', err.message);
    process.exit(1);
}

// 2. Middleware & Raw Body
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(express.raw({ type: '*/*', limit: '10mb', verify: (req, res, buf) => { req.rawBody = buf; } }));

// 3. Logger
app.use((req, res, next) => {
    console.log(`\n🚨 [${req.protocol.toUpperCase()}] ${req.method} ${req.path}`);
    
    const originalSend = res.send;
    let responseBody = null;
    res.send = function(body) { responseBody = body; originalSend.call(this, body); };

    res.on('finish', () => {
        if (req.path.includes('login') || req.method === 'POST') {
            console.log(`🔁 Response for ${req.path}:`);
            if (responseBody) {
                console.log(Buffer.isBuffer(responseBody) ? responseBody.toString('utf8').substring(0, 2000) : String(responseBody).substring(0, 2000));
            }
        }
    });
    next();
});

const axiosInstance = axios.create({ httpsAgent: new https.Agent({ rejectUnauthorized: false }) });

// 4. Ver.php Rewrite
app.get('/ver.php', async (req, res) => {
    try {
        const response = await axiosInstance.get(`${TARGET_VER_PHP}/ver.php?${new URLSearchParams(req.query).toString()}`, {
            headers: { ...req.headers, host: 'version.astutech.online' }
        });
        let data = response.data.replace(/version\.astutech\.online/g, MY_DOMAIN).replace(/srv0010\.astutech\.online/g, MY_DOMAIN);
        res.status(response.status).send(data);
    } catch (e) { res.status(502).send('Error'); }
});

// 5. Proxy All
app.use(async (req, res) => {
    if (req.path === '/ver.php') return;
    try {
        const response = await axiosInstance({
            method: req.method, url: `${TARGET_API}${req.path}`,
            headers: { ...req.headers, host: 'srv0010.astutech.online' },
            data: req.rawBody, responseType: 'arraybuffer', validateStatus: () => true
        });
        res.status(response.status);
        Object.entries(response.headers).forEach(([k, v]) => res.setHeader(k, v));
        res.send(response.data);
    } catch (e) { res.status(502).send('Proxy Error'); }
});

// 6. Start Servers
http.createServer(app).listen(HTTP_PORT, '0.0.0.0');
https.createServer(sslOptions, app).listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`🚀 Proxy running on 80 & 443! Waiting for game...`);
});
