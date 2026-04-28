const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const httpProxy = require('http-proxy');
const axios = require('axios');

const app = express();
const MY_DOMAIN = 'navidu-ff.duckdns.org';
const TARGET_VER_PHP = 'https://version.astutech.online';
const TARGET_API = 'https://srv0010.astutech.online';

// ─────────────────────────────────────────────────────────
// SSL Certificates (Let's Encrypt)
// ─────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────
// Create a proxy instance for API endpoints (MajorLogin, Ping, etc.)
// ─────────────────────────────────────────────────────────
const apiProxy = httpProxy.createProxyServer({
    target: TARGET_API,
    changeOrigin: true,
    secure: false,            // ignore self-signed cert on target
    followRedirects: false,
});

apiProxy.on('error', (err, req, res) => {
    console.error(`❌ Proxy error for ${req.method} ${req.url}:`, err.message);
    if (!res.headersSent) {
        res.status(502).send('Proxy error');
    }
});

// ─────────────────────────────────────────────────────────
// 1. /ver.php – fetch, decompress, rewrite URLs, send uncompressed
// ─────────────────────────────────────────────────────────
app.get('/ver.php', async (req, res) => {
    console.log(`\n🔧 [VER.PHP] Fetching and rewriting...`);
    try {
        // Use axios with arraybuffer – it auto-decompresses gzip/deflate
        const response = await axios({
            method: 'GET',
            url: `${TARGET_VER_PHP}/ver.php`,
            params: req.query,               // forward query parameters
            headers: {
                // Forward most headers except host
                ...req.headers,
                host: new URL(TARGET_VER_PHP).host,
                // Remove accept-encoding to let axios handle decompression
                'accept-encoding': undefined
            },
            responseType: 'arraybuffer',
            validateStatus: () => true
        });

        // Convert decompressed buffer to string (UTF-8)
        let bodyString = Buffer.from(response.data).toString('utf8');
        
        // Replace domain names (keep https://)
        bodyString = bodyString.replace(/version\.astutech\.online/g, MY_DOMAIN);
        bodyString = bodyString.replace(/srv0010\.astutech\.online/g, MY_DOMAIN);
        
        console.log(`✅ Rewritten: version.astutech.online / srv0010 → https://${MY_DOMAIN}`);

        // Prepare response headers – remove content-encoding (we send uncompressed)
        const responseHeaders = { ...response.headers };
        delete responseHeaders['content-encoding'];   // we're sending plain text
        delete responseHeaders['content-length'];     // will be recalculated
        
        // Set correct content-type (should be application/json or text/plain)
        // Preserve original content-type if present
        if (responseHeaders['content-type']) {
            res.setHeader('Content-Type', responseHeaders['content-type']);
        } else {
            res.setHeader('Content-Type', 'application/json');
        }
        
        // Forward other relevant headers (optional)
        res.setHeader('Cache-Control', responseHeaders['cache-control'] || 'no-cache');
        
        // Send the modified body as UTF-8 text
        res.status(response.status);
        res.send(bodyString);
        console.log(`✅ /ver.php rewritten and sent (${bodyString.length} bytes, uncompressed).`);
    } catch (error) {
        console.error('❌ /ver.php error:', error.message);
        res.status(502).send('Failed to fetch version config');
    }
});

// ─────────────────────────────────────────────────────────
// 2. Catch‑all: proxy everything else (MajorLogin, Ping, etc.)
//    This uses http-proxy which preserves raw binary and headers
// ─────────────────────────────────────────────────────────
app.use((req, res) => {
    if (req.path === '/ver.php') return;
    apiProxy.web(req, res);
});

// ─────────────────────────────────────────────────────────
// 3. Create HTTP (80) and HTTPS (443) servers
// ─────────────────────────────────────────────────────────
http.createServer(app).listen(80, '0.0.0.0', () => {
    console.log(`🌐 HTTP proxy listening on port 80`);
});

https.createServer(sslOptions, app).listen(443, '0.0.0.0', () => {
    console.log(`🔒 HTTPS proxy listening on port 443`);
});

console.log(`\n🚀 PROXY SERVER FULLY RUNNING on 80 & 443`);
console.log(`🔗 Client will connect to https://${MY_DOMAIN}`);
console.log(`📡 Forwarding API requests to ${TARGET_API}`);
console.log(`📦 /ver.php responses are decompressed, rewritten, and sent uncompressed.\n`);
