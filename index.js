const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const httpProxy = require('http-proxy');
const axios = require('axios');
const path = require('path');

const app = express();
const MY_DOMAIN = 'navidu-ff.duckdns.org';
const TARGET_VER_PHP = 'https://version.astutech.online';
const TARGET_API = 'https://srv0010.astutech.online';

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

const apiProxy = httpProxy.createProxyServer({
    target: TARGET_API,
    changeOrigin: true,
    secure: false,
    selfHandleResponse: true 
});

apiProxy.on('proxyRes', (proxyRes, req, res) => {
    const chunks = [];
    proxyRes.on('data', (chunk) => chunks.push(chunk));

    proxyRes.on('end', () => {
        let fullBuffer = Buffer.concat(chunks);
        
        // ─────────────────────────────────────────────────────────
        // 1. SAVE LOGIN BINARY (977 bytes එක අල්ලගන්න)
        // ─────────────────────────────────────────────────────────
        if (req.url.includes('MajorLogin') && proxyRes.statusCode === 200) {
            fs.writeFileSync('captured_login.bin', fullBuffer);
            console.log(`\n💾 [SAVED] Binary saved as captured_login.bin (${fullBuffer.length} bytes)`);
        }

        // ─────────────────────────────────────────────────────────
        // 2. BYPASS 401 PING (Session expired වෙන එක නවත්තන්න)
        // ─────────────────────────────────────────────────────────
        if (req.url.includes('Ping') && proxyRes.statusCode === 401) {
            console.log(`⚠️ [BYPASS] Fixing 401 Unauthorized for ${req.url}`);
            res.status(200).send("OK"); 
            return;
        }

        // Log response info
        if (req.url.includes('MajorLogin') || req.url.includes('Ping')) {
            console.log(`\n📡 [TARGET RESPONSE] ${req.method} ${req.url} - Status: ${proxyRes.statusCode}`);
        }

        // Forward original response
        res.status(proxyRes.statusCode);
        Object.entries(proxyRes.headers).forEach(([key, value]) => {
            if (key.toLowerCase() !== 'content-length') res.setHeader(key, value);
        });
        res.send(fullBuffer);
    });
});

app.get('/ver.php', async (req, res) => {
    try {
        const response = await axios({
            method: 'GET',
            url: `${TARGET_VER_PHP}/ver.php`,
            params: req.query,
            headers: { ...req.headers, host: new URL(TARGET_VER_PHP).host, 'accept-encoding': undefined },
            responseType: 'arraybuffer'
        });
        let bodyString = Buffer.from(response.data).toString('utf8');
        bodyString = bodyString.replace(/version\.astutech\.online/g, MY_DOMAIN);
        bodyString = bodyString.replace(/srv0010\.astutech\.online/g, MY_DOMAIN);
        res.status(response.status).send(bodyString);
    } catch (error) {
        res.status(502).send('Error');
    }
});

app.use((req, res) => apiProxy.web(req, res));

http.createServer(app).listen(80);
https.createServer(sslOptions, app).listen(443);
console.log(`🚀 Proxy Running. Saving binary and bypassing 401...`);
