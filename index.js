const express = require('express');
const axios = require('axios');
const https = require('https');
const http = require('http');
const fs = require('fs');
const app = express();

const MY_DOMAIN = 'navidu-ff.duckdns.org';
const TARGET_VER_PHP = 'https://version.astutech.online';
const TARGET_API = 'https://srv0010.astutech.online';

// SSL Certificates (Let's Encrypt)
let sslOptions;
try {
    sslOptions = {
        key: fs.readFileSync(`/etc/letsencrypt/live/${MY_DOMAIN}/privkey.pem`),
        cert: fs.readFileSync(`/etc/letsencrypt/live/${MY_DOMAIN}/fullchain.pem`)
    };
    console.log('✅ SSL certificates loaded successfully');
} catch (err) {
    console.error('❌ SSL Load Error:', err.message);
    process.exit(1);
}

app.use(express.raw({ type: '*/*', limit: '10mb' }));

const axiosInstance = axios.create({
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
});

function forwardHeaders(originalHeaders) {
    const headers = { ...originalHeaders };
    delete headers.host;
    delete headers['content-length'];
    return headers;
}

// 1. /ver.php Handler (Rewrite logic)
app.get('/ver.php', async (req, res) => {
    console.log(`🔧 [VER.PHP] Rewriting domains...`);
    try {
        const response = await axiosInstance({
            method: 'GET',
            url: `${TARGET_VER_PHP}/ver.php?${new URLSearchParams(req.query).toString()}`,
            headers: forwardHeaders(req.headers),
            responseType: 'text'
        });

        let data = response.data.replace(/version\.astutech\.online/g, MY_DOMAIN)
                                .replace(/srv0010\.astutech\.online/g, MY_DOMAIN);
        res.send(data);
    } catch (e) {
        res.status(502).send('Error');
    }
});

// 2. Catch-all Middleware (PathError එක එන්නේ නැති වෙන්න මෙහෙමයි කරන්නේ)
app.use(async (req, res) => {
    // /ver.php දැනටමත් handle වෙලා නිසා ඒක skip කරනවා
    if (req.path === '/ver.php') return;

    console.log(`🔄 [PROXY] ${req.method} ${req.path}`);
    try {
        const response = await axiosInstance({
            method: req.method,
            url: `${TARGET_API}${req.path}`,
            headers: forwardHeaders(req.headers),
            data: req.body,
            responseType: 'arraybuffer'
        });

        res.status(response.status).send(response.data);
    } catch (error) {
        console.error(`❌ Proxy Error: ${error.message}`);
        res.status(502).send('Proxy Error');
    }
});

http.createServer(app).listen(80, '0.0.0.0');
https.createServer(sslOptions, app).listen(443, '0.0.0.0', () => {
    console.log(`🚀 PROXY SERVER IS FULLY RUNNING ON 80 & 443`);
});
