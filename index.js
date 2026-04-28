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
// Create a proxy instance with selfHandleResponse = true
// so we can log the response body without breaking the stream
// ─────────────────────────────────────────────────────────
const apiProxy = httpProxy.createProxyServer({
    target: TARGET_API,
    changeOrigin: true,
    secure: false,
    followRedirects: false,
    selfHandleResponse: true   // <-- allows us to manually forward the response
});

// Handle proxy errors
apiProxy.on('error', (err, req, res) => {
    console.error(`❌ Proxy error for ${req.method} ${req.url}:`, err.message);
    if (!res.headersSent) {
        res.status(502).send('Proxy error');
    }
});

// ─────────────────────────────────────────────────────────
// Intercept the response from the target server
// ─────────────────────────────────────────────────────────
apiProxy.on('proxyRes', (proxyRes, req, res) => {
    // Buffer all chunks from the target server
    const chunks = [];
    proxyRes.on('data', (chunk) => {
        chunks.push(chunk);
    });

    proxyRes.on('end', () => {
        const fullBuffer = Buffer.concat(chunks);
        const contentType = proxyRes.headers['content-type'] || '';

        // Log response for important endpoints
        if (req.url.includes('MajorLogin') || req.url.includes('Ping') || req.url.includes('login')) {
            console.log(`\n📡 [TARGET RESPONSE] ${req.method} ${req.url} - Status: ${proxyRes.statusCode}`);
            console.log(`📋 Response Headers:`, JSON.stringify(proxyRes.headers, null, 2));

            // Try to decode as UTF-8 (assuming JSON or text)
            let bodyText = '(binary data)';
            if (contentType.includes('application/json') || contentType.includes('text/')) {
                bodyText = fullBuffer.toString('utf8');
                try {
                    // Pretty-print JSON if possible
                    const json = JSON.parse(bodyText);
                    bodyText = JSON.stringify(json, null, 2);
                } catch (e) {
                    // Not JSON, keep as is
                }
            }
            console.log(`📨 Response Body:\n${bodyText.substring(0, 3000)}${bodyText.length > 3000 ? '\n... (truncated)' : ''}`);
        }

        // Forward the original status code and headers to the game client
        res.status(proxyRes.statusCode);
        Object.entries(proxyRes.headers).forEach(([key, value]) => {
            // Skip content-length because we'll let Express set it
            if (key.toLowerCase() !== 'content-length') {
                res.setHeader(key, value);
            }
        });
        // Send the exact buffer to the client
        res.send(fullBuffer);
    });
});

// ─────────────────────────────────────────────────────────
// 1. /ver.php – fetch, decompress, rewrite URLs, send uncompressed
// ─────────────────────────────────────────────────────────
app.get('/ver.php', async (req, res) => {
    console.log(`\n🔧 [VER.PHP] Fetching and rewriting...`);
    try {
        const response = await axios({
            method: 'GET',
            url: `${TARGET_VER_PHP}/ver.php`,
            params: req.query,
            headers: {
                ...req.headers,
                host: new URL(TARGET_VER_PHP).host,
                'accept-encoding': undefined  // let axios decompress
            },
            responseType: 'arraybuffer',
            validateStatus: () => true
        });

        let bodyString = Buffer.from(response.data).toString('utf8');
        bodyString = bodyString.replace(/version\.astutech\.online/g, MY_DOMAIN);
        bodyString = bodyString.replace(/srv0010\.astutech\.online/g, MY_DOMAIN);
        
        console.log(`✅ Rewritten: version.astutech.online / srv0010 → https://${MY_DOMAIN}`);

        const responseHeaders = { ...response.headers };
        delete responseHeaders['content-encoding'];
        delete responseHeaders['content-length'];
        
        res.setHeader('Content-Type', responseHeaders['content-type'] || 'application/json');
        res.setHeader('Cache-Control', responseHeaders['cache-control'] || 'no-cache');
        res.status(response.status);
        res.send(bodyString);
        console.log(`✅ /ver.php rewritten and sent (${bodyString.length} bytes, uncompressed).`);
    } catch (error) {
        console.error('❌ /ver.php error:', error.message);
        res.status(502).send('Failed to fetch version config');
    }
});

// ─────────────────────────────────────────────────────────
// 2. Catch‑all: proxy everything else to apiProxy
// ─────────────────────────────────────────────────────────
app.use((req, res) => {
    if (req.path === '/ver.php') return;
    // Pass the request to our custom proxy handler (selfHandleResponse)
    apiProxy.web(req, res);
});

// ─────────────────────────────────────────────────────────
// 3. Create HTTP and HTTPS servers
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
