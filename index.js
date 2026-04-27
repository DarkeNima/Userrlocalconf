const express = require('express');
const axios = require('axios');
const net = require('net');
const https = require('https');
const http = require('http');
const fs = require('fs');
const app = express();

const MY_DOMAIN = 'navidu-ff.duckdns.org';
const TARGET_VER_PHP = 'https://version.astutech.online';
const TARGET_API = 'https://srv0010.astutech.online';

// 1. SSL Load
let sslOptions;
try {
    sslOptions = {
        key: fs.readFileSync('/etc/letsencrypt/live/navidu-ff.duckdns.org/privkey.pem'),
        cert: fs.readFileSync('/etc/letsencrypt/live/navidu-ff.duckdns.org/fullchain.pem')
    };
    console.log('✅ SSL Certificates Loaded!');
} catch (err) {
    console.error('❌ SSL Error:', err.message);
    process.exit(1);
}

// 2. Middleware
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
            if (responseBody) console.log(responseBody.toString().substring(0, 1000));
        }
    });
    next();
});

const axiosInstance = axios.create({ httpsAgent: new https.Agent({ rejectUnauthorized: false }) });

// 4. Routes
app.get('/ver.php', async (req, res) => {
    try {
        const response = await axiosInstance.get(`${TARGET_VER_PHP}/ver.php?${new URLSearchParams(req.query).toString()}`, {
            headers: { ...req.headers, host: 'version.astutech.online' }
        });
        let body = response.data.replace(/version\.astutech\.online/g, MY_DOMAIN).replace(/srv0010\.astutech\.online/g, MY_DOMAIN);
        res.status(response.status).send(body);
    } catch (e) { res.status(502).send('Error'); }
});

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

// 5. Start
http.createServer(app).listen(80, '0.0.0.0');
https.createServer(sslOptions, app).listen(443, '0.0.0.0', () => {
    console.log(`🚀 EVERYTHING IS LIVE! Ready for game...`);
});
