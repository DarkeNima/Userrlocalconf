const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const httpProxy = require('http-proxy');
const axios = require('axios');

const app = express();
const MY_DOMAIN = 'navidu-ff.duckdns.org';
const TARGET_VER_PHP = 'https://version.astutech.online';
const TARGET_API = 'https://srv0010.astutech.online';

// File to store the successful login binary response
const SUCCESS_LOGIN_FILE = path.join(__dirname, 'login_success.bin');

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
// ─────────────────────────────────────────────────────────
const apiProxy = httpProxy.createProxyServer({
    target: TARGET_API,
    changeOrigin: true,
    secure: false,
    followRedirects: false,
    selfHandleResponse: true
});

apiProxy.on('error', (err, req, res) => {
    console.error(`❌ Proxy error for ${req.method} ${req.url}:`, err.message);
    if (!res.headersSent) {
        res.status(502).send('Proxy error');
    }
});

// ─────────────────────────────────────────────────────────
// Helper: Send binary response to client
// ─────────────────────────────────────────────────────────
function sendBinaryResponse(res, buffer, statusCode = 200, headers = {}) {
    res.status(statusCode);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', buffer.length);
    // Optionally copy other headers from original success response
    Object.entries(headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'content-length' && key.toLowerCase() !== 'content-type') {
            res.setHeader(key, value);
        }
    });
    res.send(buffer);
}

// ─────────────────────────────────────────────────────────
// Intercept and log / hijack /MajorLogin responses
// ─────────────────────────────────────────────────────────
apiProxy.on('proxyRes', (proxyRes, req, res) => {
    const chunks = [];
    proxyRes.on('data', (chunk) => chunks.push(chunk));
    proxyRes.on('end', () => {
        const fullBuffer = Buffer.concat(chunks);
        const contentType = proxyRes.headers['content-type'] || '';
        const isMajorLogin = req.url === '/MajorLogin' || req.path === '/MajorLogin';

        // --- SUCCESSFUL LOGIN FROM ASTER → SAVE BINARY ---
        if (isMajorLogin && proxyRes.statusCode === 200 && contentType.includes('application/octet-stream')) {
            console.log(`\n💾 [SAVE SUCCESS] Saving binary login response to ${SUCCESS_LOGIN_FILE}`);
            fs.writeFileSync(SUCCESS_LOGIN_FILE, fullBuffer);
            console.log(`✅ Saved ${fullBuffer.length} bytes.`);
            // Forward the original success response to client
            sendBinaryResponse(res, fullBuffer, 200, proxyRes.headers);
            return;
        }

        // --- FAILED LOGIN (400, 401, etc.) → HIJACK IF WE HAVE SAVED FILE ---
        if (isMajorLogin && proxyRes.statusCode !== 200 && fs.existsSync(SUCCESS_LOGIN_FILE)) {
            console.log(`\n🎯 [HIJACK] Target returned ${proxyRes.statusCode} - serving saved login success instead.`);
            try {
                const hijackBuffer = fs.readFileSync(SUCCESS_LOGIN_FILE);
                console.log(`✅ Sending hijacked response (${hijackBuffer.length} bytes) with status 200.`);
                sendBinaryResponse(res, hijackBuffer, 200, {});
                return;
            } catch (err) {
                console.error(`❌ Failed to read saved login file:`, err.message);
                // Fall through to send the original error
            }
        }

        // --- DEFAULT: Forward the original response (unchanged) ---
        // For non-MajorLogin or when no hijacking occurs
        res.status(proxyRes.statusCode);
        Object.entries(proxyRes.headers).forEach(([key, value]) => {
            if (key.toLowerCase() !== 'content-length') {
                res.setHeader(key, value);
            }
        });
        res.send(fullBuffer);

        // Log important endpoints for debugging
        if (isMajorLogin || req.url.includes('Ping')) {
            console.log(`\n📡 [TARGET RESPONSE] ${req.method} ${req.url} - Status: ${proxyRes.statusCode}`);
            if (contentType.includes('text/') || contentType.includes('json')) {
                const bodyText = fullBuffer.toString('utf8');
                console.log(`📨 Body (first 500 chars):\n${bodyText.substring(0, 500)}`);
            } else {
                console.log(`📨 Binary body (${fullBuffer.length} bytes)`);
            }
        }
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
                'accept-encoding': undefined
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
console.log(`📦 /ver.php responses are decompressed, rewritten, and sent uncompressed.`);
console.log(`💾 Login success binary will be saved to ${SUCCESS_LOGIN_FILE}`);
console.log(`🎯 Hijack mode ACTIVE: on 400/error for /MajorLogin, saved success will be sent instead.\n`);
