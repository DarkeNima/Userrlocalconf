const express = require('express');
const axios = require('axios');
const net = require('net');
const app = express();
const PORT = 80;

// ✅ ඔයාගේ VPS දත්ත
const MY_DOMAIN = 'navidu-ff.duckdns.org';
const MY_URL = `http://${MY_DOMAIN}`;
const TARGET_SERVER = 'https://version.astutech.online';

// ─────────────────────────────────────────────────────────
// Middleware: Capture raw request body (Binary/Protobuf වලට අත්‍යවශ්‍යයි)
// ─────────────────────────────────────────────────────────
app.use(express.raw({ type: '*/*', limit: '10mb' }));

// Helper: Headers Forward කරන කොට host සහ content-length අයින් කරනවා (Axios මගින් ඒවා හදන නිසා)
function forwardHeaders(originalHeaders) {
    const headers = { ...originalHeaders };
    delete headers.host;
    delete headers['content-length'];
    return headers;
}

// ─────────────────────────────────────────────────────────
// 1. Proxy for /MajorLogin – 100% Transparent Forwarding
// ─────────────────────────────────────────────────────────
app.post('/MajorLogin', async (req, res) => {
    console.log(`\n🎯 [MAJOR LOGIN ATTEMPT] Forwarding to Astute...`);
    try {
        const targetUrl = `${TARGET_SERVER}/MajorLogin`;
        const headers = forwardHeaders(req.headers);

        const response = await axios({
            method: 'POST',
            url: targetUrl,
            headers: headers,
            data: req.body,               // Raw buffer එක එහෙම්ම යවනවා
            responseType: 'arraybuffer',  // Binary response එකක් ආවත් අවුලක් වෙන්නේ නැහැ
            validateStatus: () => true 
        });

        // Astute එකෙන් ලැබුණු දත්ත එහෙම්ම ගේම් එකට යවනවා
        res.status(response.status);
        Object.entries(response.headers).forEach(([key, value]) => {
            res.setHeader(key, value);
        });
        res.send(response.data);
        console.log(`✅ Login response relayed successfully.`);
    } catch (error) {
        console.error('❌ MajorLogin proxy error:', error.message);
        res.status(502).send('Proxy error');
    }
});

// ─────────────────────────────────────────────────────────
// 2. Proxy + URL Rewriting for /ver.php
// ─────────────────────────────────────────────────────────
app.get('/ver.php', async (req, res) => {
    console.log(`\n🔎 [VER.PHP REQUEST] Fetching and modifying...`);
    try {
        const targetUrl = `${TARGET_SERVER}/ver.php`;
        const queryString = new URLSearchParams(req.query).toString();
        const fullTargetUrl = queryString ? `${targetUrl}?${queryString}` : targetUrl;

        const response = await axios({
            method: 'GET',
            url: fullTargetUrl,
            headers: forwardHeaders(req.headers),
            responseType: 'text',
            validateStatus: () => true
        });

        let modifiedBody = response.data;
        const contentType = response.headers['content-type'] || '';

        // JSON හෝ Text දත්ත නම් පමණක් අපේ Domain එකට URL මාරු කරනවා
        if (contentType.includes('text/') || contentType.includes('application/json')) {
            const targetEscaped = TARGET_SERVER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(targetEscaped, 'g');
            modifiedBody = modifiedBody.replace(regex, MY_URL);
            
            // අමතරව වෙනත් domains තිබුණොත් ඒවාත් මාරු කරනවා
            modifiedBody = modifiedBody.replace(/versions\.garenanow\.live/g, MY_DOMAIN);
            modifiedBody = modifiedBody.replace(/gin\.freefiremobile\.com/g, MY_DOMAIN);
        }

        res.status(response.status);
        Object.entries(response.headers).forEach(([key, value]) => {
            if (key.toLowerCase() !== 'content-length') {
                res.setHeader(key, value);
            }
        });
        res.send(modifiedBody);
        console.log(`✅ ver.php modified and sent.`);
    } catch (error) {
        console.error('❌ ver.php proxy error:', error.message);
        res.status(502).send('Proxy error');
    }
});

// ─────────────────────────────────────────────────────────
// 3. Catch-All for Other Paths (Ping, etc.)
// ─────────────────────────────────────────────────────────
app.all(/.*/, async (req, res) => {
    if (req.path === '/ver.php' || req.path === '/MajorLogin') return;
    console.log(`\n🔎 [OTHER PATH]: ${req.method} ${req.path}`);
    res.status(200).send("OK");
});

// HTTP Server Start
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Proxy running on Port ${PORT}`);
    console.log(`🔗 Domain: ${MY_URL} -> Targeting: ${TARGET_SERVER}`);
});

// ─────────────────────────────────────────────────────────
// 4. TCP Core Listener (Port 7006)
// ─────────────────────────────────────────────────────────
const tcpServer = net.createServer((socket) => {
    console.log(`\n📡 [TCP CONNECT] Client: ${socket.remoteAddress}`);
    socket.on('data', (data) => {
        console.log(`📩 [TCP DATA]: ${data.length} bytes`);
    });
    socket.on('error', (err) => console.log(`❌ TCP Error: ${err.message}`));
});

tcpServer.listen(7006, '0.0.0.0', () => {
    console.log("🚀 TCP Core Listener is active on Port 7006");
});
