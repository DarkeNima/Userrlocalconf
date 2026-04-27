const express = require('express');
const axios = require('axios');
const net = require('net');
const https = require('https');
const app = express();
const PORT = 80;

const MY_DOMAIN = 'navidu-ff.duckdns.org';
const MY_URL = `http://${MY_DOMAIN}`;
const TARGET_VER_PHP = 'https://version.astutech.online';
const TARGET_API = 'https://srv0010.astutech.online';

// ─────────────────────────────────────────────────────────
// Global middleware: capture raw body & log ALL incoming requests
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

// Log EVERY request with path highlight
app.use((req, res, next) => {
    console.log(`\n🚨 GAME IS HITTING PATH: ${req.method} ${req.path}`);
    console.log(`📋 Full Headers:`, JSON.stringify(req.headers, null, 2));
    console.log(`📦 Body (${req.rawBody ? req.rawBody.length : 0} bytes): ${getBodyPreview(req)}`);
    
    // Intercept response for logging (only for login paths)
    const originalSend = res.send;
    const originalJson = res.json;
    let responseBody = null;

    res.send = function(body) { responseBody = body; originalSend.call(this, body); };
    res.json = function(body) { responseBody = JSON.stringify(body); originalJson.call(this, body); };

    res.on('finish', () => {
        if (req.path.includes('login') || req.path.includes('MajorLogin') || req.method === 'POST') {
            console.log(`🔁 [RESPONSE] ${req.method} ${req.path} - Status: ${res.statusCode}`);
            if (responseBody) {
                const bodyStr = Buffer.isBuffer(responseBody) ? responseBody.toString('utf8') : String(responseBody);
                console.log(`📨 Response Body (first 2000 chars):\n${bodyStr.substring(0, 2000)}`);
            }
        }
    });
    next();
});

// Forward headers: keep EVERYTHING except 'host' and 'content-length'
function forwardHeaders(originalHeaders) {
    const headers = { ...originalHeaders };
    delete headers.host;               // axios will set correct host
    delete headers['content-length'];  // axios recomputes
    return headers;
}

// Axios instance with HTTPS ignoring certificate errors (temporary for debugging)
const axiosInstance = axios.create({
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
});

// ─────────────────────────────────────────────────────────
// 1. /ver.php – rewrite server_url to YOUR domain (http)
// ─────────────────────────────────────────────────────────
app.get('/ver.php', async (req, res) => {
    console.log(`\n🔧 [VER.PHP] Fetching & rewriting URLs...`);
    try {
        const queryString = new URLSearchParams(req.query).toString();
        const fullTargetUrl = queryString ? `${TARGET_VER_PHP}/ver.php?${queryString}` : `${TARGET_VER_PHP}/ver.php`;

        const response = await axiosInstance({
            method: 'GET',
            url: fullTargetUrl,
            headers: forwardHeaders(req.headers),
            responseType: 'text',
            validateStatus: () => true
        });

        let modifiedBody = response.data;
        const contentType = response.headers['content-type'] || '';

        if (contentType.includes('text/') || contentType.includes('application/json')) {
            modifiedBody = modifiedBody.replace(/version\.astutech\.online/g, MY_DOMAIN);
            modifiedBody = modifiedBody.replace(/srv0010\.astutech\.online/g, MY_DOMAIN);
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
// 2. OPTIONAL: Hardcoded /MajorLogin (uncomment later)
// ─────────────────────────────────────────────────────────
// app.post('/MajorLogin', (req, res) => {
//     console.log(`🎮 [MOCK] Independent MajorLogin response`);
//     res.json({
//         "status": 0,
//         "account_id": "123456789",
//         "session_key": "fake_session_" + Date.now(),
//         "core_url": "http://navidu-ff.duckdns.org:7006",
//         "game_version": "1.123.8",
//         "server_time": Math.floor(Date.now() / 1000),
//         "region": "IND",
//         "need_verification": false
//     });
// });

// ─────────────────────────────────────────────────────────
// 3. CATCH-ALL PROXY – using app.use() (works in Express 4 & 5)
// ─────────────────────────────────────────────────────────
const catchAllHandler = async (req, res, next) => {
    // Skip already handled routes
    if (req.path === '/ver.php') return next();

    const targetUrl = `${TARGET_API}${req.path}`;
    console.log(`🔄 [PROXY] Forwarding ${req.method} ${req.path} → ${targetUrl}`);
    console.log(`🔑 Forwarding headers:`, JSON.stringify(forwardHeaders(req.headers), null, 2));

    try {
        const response = await axiosInstance({
            method: req.method,
            url: targetUrl,
            headers: forwardHeaders(req.headers),
            data: req.rawBody,
            responseType: 'arraybuffer',
            validateStatus: () => true
        });

        // EXTREME LOGGING: full response from Astute
        console.log(`📡 Astute response status: ${response.status}`);
        console.log(`📡 Astute response headers:`, JSON.stringify(response.headers, null, 2));
        const responseText = Buffer.from(response.data).toString('utf8');
        console.log(`📡 Astute response body (first 3000 chars):\n${responseText.substring(0, 3000)}`);

        // Forward everything back to game
        res.status(response.status);
        Object.entries(response.headers).forEach(([key, value]) => {
            if (key.toLowerCase() !== 'content-length') res.setHeader(key, value);
        });
        res.send(response.data);
    } catch (error) {
        console.error(`❌ Proxy error for ${req.path}:`, error.message);
        if (error.response) {
            console.error(`   Astute returned status: ${error.response.status}`);
            console.error(`   Headers:`, error.response.headers);
        }
        res.status(502).send('Proxy error');
    }
};

// ✅ This catches EVERY request (GET, POST, etc.) for ANY path
app.use(catchAllHandler);

// ─────────────────────────────────────────────────────────
// 4. TCP Core Listener (port 7006) – log everything
// ─────────────────────────────────────────────────────────
const tcpServer = net.createServer((socket) => {
    console.log(`\n📡 [TCP CORE] Client connected: ${socket.remoteAddress}`);
    socket.on('data', (data) => {
        console.log(`📩 [TCP DATA] ${data.length} bytes from ${socket.remoteAddress}`);
        // Optionally echo or parse game packets here
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
    console.log(`📡 Forwarding API calls to ${TARGET_API}`);
    console.log(`🔓 TLS certificate validation disabled (rejectUnauthorized: false)`);
});
