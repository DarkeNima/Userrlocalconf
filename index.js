const express = require('express');
const axios = require('axios');
const net = require('net');
const app = express();
const PORT = 80;

const MY_DOMAIN = 'navidu-ff.duckdns.org';
const MY_URL = `http://${MY_DOMAIN}`;
const TARGET_VER_PHP = 'https://version.astutech.online';      // for /ver.php only
const TARGET_API = 'https://srv0010.astutech.online';          // for all other endpoints

// ─────────────────────────────────────────────────────────
// Global middleware: capture raw body & log ALL traffic
// ─────────────────────────────────────────────────────────
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: true, verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(express.raw({ type: '*/*', limit: '10mb', verify: (req, res, buf) => { req.rawBody = buf; } }));

function getBodyPreview(req) {
    if (!req.rawBody) return '(empty)';
    const raw = req.rawBody.toString('utf8');
    if (raw.length > 1000) return raw.substring(0, 1000) + '... (truncated)';
    return raw;
}

app.use((req, res, next) => {
    console.log(`\n📡 [INCOMING] ${req.method} ${req.url}`);
    console.log(`📋 Headers:`, JSON.stringify(req.headers, null, 2));
    console.log(`📦 Body (${req.rawBody ? req.rawBody.length : 0} bytes): ${getBodyPreview(req)}`);

    // Intercept response to log body for login-related endpoints
    const originalSend = res.send;
    const originalJson = res.json;
    let responseBody = null;

    res.send = function(body) { responseBody = body; originalSend.call(this, body); };
    res.json = function(body) { responseBody = JSON.stringify(body); originalJson.call(this, body); };

    res.on('finish', () => {
        if (req.method === 'POST' || req.url.includes('login') || req.url.includes('MajorLogin')) {
            console.log(`🔁 [RESPONSE] ${req.method} ${req.url} - Status: ${res.statusCode}`);
            if (responseBody) {
                const bodyStr = Buffer.isBuffer(responseBody) ? responseBody.toString('utf8') : String(responseBody);
                console.log(`📨 Response Body (first 2000 chars):\n${bodyStr.substring(0, 2000)}`);
            }
        }
    });
    next();
});

// Helper to forward headers (remove host & content-length)
function forwardHeaders(originalHeaders) {
    const headers = { ...originalHeaders };
    delete headers.host;
    delete headers['content-length'];
    return headers;
}

// ─────────────────────────────────────────────────────────
// 1. /ver.php – rewrite server_url to YOUR domain (http)
// ─────────────────────────────────────────────────────────
app.get('/ver.php', async (req, res) => {
    console.log(`\n🔧 [VER.PHP] Fetching & rewriting URLs...`);
    try {
        const queryString = new URLSearchParams(req.query).toString();
        const fullTargetUrl = queryString ? `${TARGET_VER_PHP}/ver.php?${queryString}` : `${TARGET_VER_PHP}/ver.php`;

        const response = await axios({
            method: 'GET',
            url: fullTargetUrl,
            headers: forwardHeaders(req.headers),
            responseType: 'text',
            validateStatus: () => true
        });

        let modifiedBody = response.data;
        const contentType = response.headers['content-type'] || '';

        if (contentType.includes('text/') || contentType.includes('application/json')) {
            // Replace ALL occurrences of Astute domains with YOUR domain
            modifiedBody = modifiedBody.replace(/version\.astutech\.online/g, MY_DOMAIN);
            modifiedBody = modifiedBody.replace(/srv0010\.astutech\.online/g, MY_DOMAIN);
            // Change https:// to http:// (your proxy runs on port 80)
            modifiedBody = modifiedBody.replace(/https:\/\//g, 'http://');
            console.log(`✅ Rewritten: ${TARGET_VER_PHP} / srv0010 → ${MY_URL}`);
        }

        res.status(response.status);
        Object.entries(response.headers).forEach(([key, value]) => {
            if (key.toLowerCase() !== 'content-length') res.setHeader(key, value);
        });
        res.send(modifiedBody);
    } catch (error) {
        console.error('❌ /ver.php error:', error.message);
        res.status(502).send('Proxy error');
    }
});

// ─────────────────────────────────────────────────────────
// 2. OPTIONAL: Hardcoded /MajorLogin (uncomment to go 100% independent)
// ─────────────────────────────────────────────────────────
// app.post('/MajorLogin', (req, res) => {
//     console.log(`🎮 [MOCK] Independent MajorLogin response`);
//     res.json({
//         "status": 0,
//         "account_id": "123456789",
//         "session_key": "fake_session_" + Date.now(),
//         "core_url": "http://navidu-ff.duckdns.org:7006",  // your TCP core
//         "game_version": "1.123.8",
//         "server_time": Math.floor(Date.now() / 1000),
//         "region": "IND",
//         "login_mode": 1,
//         "need_verification": false,
//         "verify_id": null
//     });
// });

// ─────────────────────────────────────────────────────────
// 3. Catch-all proxy – forward everything else to srv0010.astutech.online
// ─────────────────────────────────────────────────────────
// ❌ Remove this problematic line
// app.all('*', async (req, res) => { ...

// ✅ Replace it with a named wildcard. 'splat' can be any name you prefer.
app.all('/{*splat}', async (req, res) => {
    // Skip already handled paths
    if (req.path === '/ver.php') return;

    const targetUrl = `${TARGET_API}${req.path}`;
    console.log(`🔄 [PROXY] Forwarding ${req.method} ${req.path} → ${targetUrl}`);

    try {
        const response = await axios({
            method: req.method,
            url: targetUrl,
            headers: forwardHeaders(req.headers),
            data: req.rawBody,               // preserve exact body
            responseType: 'arraybuffer',
            validateStatus: () => true
        });

        // Log the actual response from srv0010 (your lobby login data!)
        if (req.path.includes('login') || req.path.includes('MajorLogin')) {
            const responseText = Buffer.from(response.data).toString('utf8');
            console.log(`📦 [ASTUTE RESPONSE] ${req.path}:\n${responseText.substring(0, 2000)}`);
        }

        res.status(response.status);
        Object.entries(response.headers).forEach(([key, value]) => {
            if (key.toLowerCase() !== 'content-length') res.setHeader(key, value);
        });
        res.send(response.data);
    } catch (error) {
        console.error(`❌ Proxy error for ${req.path}:`, error.message);
        res.status(502).send('Proxy error');
    }
});

// ─────────────────────────────────────────────────────────
// 4. TCP Core Listener (port 7006) – for game logic
// ─────────────────────────────────────────────────────────
const tcpServer = net.createServer((socket) => {
    console.log(`\n📡 [TCP CORE] Client connected: ${socket.remoteAddress}`);
    socket.on('data', (data) => {
        console.log(`📩 [TCP DATA] ${data.length} bytes from ${socket.remoteAddress}`);
        // You can later implement custom game logic here
    });
    socket.on('error', (err) => console.log(`❌ TCP Error: ${err.message}`));
    socket.on('close', () => console.log(`🔌 TCP Client disconnected`));
});
tcpServer.listen(7006, '0.0.0.0', () => {
    console.log(`🚀 TCP Core listening on port 7006`);
});

// ─────────────────────────────────────────────────────────
// Start HTTP proxy
// ─────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 HTTP Proxy running on port ${PORT}`);
    console.log(`🔗 Your domain: ${MY_URL} → hijacking Astute's server_url`);
    console.log(`📡 Forwarding API calls to ${TARGET_API}\n`);
});
