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
const MY_URL_HTTP = `http://${MY_DOMAIN}`;
const MY_URL_HTTPS = `https://${MY_DOMAIN}`;
const TARGET_VER_PHP = 'https://version.astutech.online';
const TARGET_API = 'https://srv0010.astutech.online';

// ─────────────────────────────────────────────────────────
// Load SSL certificates (update paths if needed)
// ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────
// Load REAL SSL certificates from Let's Encrypt
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

    console.log('✅ SSL certificates loaded successfully');
} catch (err) {
    console.error('❌ Failed to load SSL certificates:', err.message);
    process.exit(1);
}

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

// Log EVERY request (will work for both HTTP and HTTPS)
app.use((req, res, next) => {
    const protocol = req.secure ? 'HTTPS' : 'HTTP';
    console.log(`\n🚨 [${protocol}] GAME IS HITTING PATH: ${req.method} ${req.path}`);
    console.log(`📋 Full Headers:`, JSON.stringify(req.headers, null, 2));
    console.log(`📦 Body (${req.rawBody ? req.rawBody.length : 0} bytes): ${getBodyPreview(req)}`);
    
    // Intercept response for logging
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
    delete headers.host;
    delete headers['content-length'];
    // Keep all Garena-specific, X-Forwarded-*, etc.
    return headers;
}

// Axios instance with HTTPS ignoring certificate errors (temporary)
const axiosInstance = axios.create({
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
});

// ─────────────────────────────────────────────────────────
// 1. /ver.php – rewrite server_url to YOUR domain (preserve HTTPS)
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
            // Replace domains but KEEP https:// (so game uses our HTTPS server)
            modifiedBody = modifiedBody.replace(/version\.astutech\.online/g, MY_DOMAIN);
            modifiedBody = modifiedBody.replace(/srv0010\.astutech\.online/g, MY_DOMAIN);
            // Do NOT change https:// to http:// – leave as https://
            // The game will then connect to https://navidu-ff.duckdns.org
            console.log(`✅ Rewritten: ${TARGET_VER_PHP} / srv0010 → ${MY_URL_HTTPS}`);
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
// 2. OPTIONAL: Hardcoded /MajorLogin (uncomment when ready)
// ─────────────────────────────────────────────────────────
// app.post('/MajorLogin', (req, res) => {
//     console.log(`🎮 [MOCK] Independent MajorLogin response via HTTPS`);
//     res.json({
//         "status": 0,
//         "account_id": "123456789",
//         "session_key": "fake_session_" + Date.now(),
//         "core_url": `${MY_URL_HTTPS}:7006`,  // or ws:// if needed
//         "game_version": "1.123.8",
//         "server_time": Math.floor(Date.now() / 1000),
//         "region": "IND",
//         "need_verification": false
//     });
// });

// ─────────────────────────────────────────────────────────
// 3. Catch-all proxy – forward everything else to srv0010.astutech.online
// ─────────────────────────────────────────────────────────
const catchAllHandler = async (req, res) => {
    // Skip already handled paths
    if (req.path === '/ver.php') return;

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

// Use app.use() to catch all methods and paths (works for both HTTP and HTTPS)
app.use(catchAllHandler);

// ─────────────────────────────────────────────────────────
// 4. TCP Core Listener (port 7006) – same as before
// ─────────────────────────────────────────────────────────
const tcpServer = net.createServer((socket) => {
    console.log(`\n📡 [TCP CORE] Client connected: ${socket.remoteAddress}`);
    socket.on('data', (data) => {
        console.log(`📩 [TCP DATA] ${data.length} bytes from ${socket.remoteAddress}`);
    });
    socket.on('error', (err) => console.log(`❌ TCP Error: ${err.message}`));
    socket.on('close', () => console.log(`🔌 TCP Client disconnected`));
});
tcpServer.listen(7006, '0.0.0.0', () => {
    console.log(`🚀 TCP Core listening on port 7006`);
});

// ─────────────────────────────────────────────────────────
// 5. Create and start HTTP and HTTPS servers
// ─────────────────────────────────────────────────────────
// HTTP server (port 80)
http.createServer(app).listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`🌐 HTTP proxy listening on port ${HTTP_PORT}`);
});

// HTTPS server (port 443)
https.createServer(sslOptions, app).listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`🔒 HTTPS proxy listening on port ${HTTPS_PORT}`);
});

console.log(`\n🔗 Your domain: ${MY_URL_HTTPS} → hijacking Astute's server_url`);
console.log(`📡 Forwarding API calls to ${TARGET_API}`);
console.log(`🔓 TLS certificate validation disabled for outgoing requests (rejectUnauthorized: false)`);
console.log(`✅ Ready to accept both HTTP and HTTPS game traffic.\n`);
