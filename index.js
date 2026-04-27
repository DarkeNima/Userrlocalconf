const express = require('express');
const axios = require('axios');
const net = require('net');
const app = express();
const PORT = 80;

// ✅ ඔයාගේ VPS දත්ත
const MY_DOMAIN = 'navidu-ff.duckdns.org';
const MY_URL = `http://${MY_DOMAIN}`;
const TARGET_SERVER = 'https://version.astutech.online';

app.use(express.raw({ type: '*/*', limit: '10mb' }));

// Helper: Headers Forward කිරීම
function forwardHeaders(originalHeaders) {
    const headers = { ...originalHeaders };
    delete headers.host;
    delete headers['content-length'];
    return headers;
}

// Helper: Binary දත්ත Text බවට හැරවීම (Logging සඳහා)
function decodeArrayBufferToText(buffer) {
    try {
        return Buffer.from(buffer).toString('utf8');
    } catch (e) {
        return '[Binary Data - Cannot decode as UTF-8]';
    }
}

// ─────────────────────────────────────────────────────────
// 1. Proxy for /MajorLogin – INTERCEPT & MODIFY
// ─────────────────────────────────────────────────────────
app.post('/MajorLogin', async (req, res) => {
    console.log(`\n🎯 [MAJOR LOGIN] Forwarding to Astute...`);

    try {
        const targetUrl = `${TARGET_SERVER}/MajorLogin`;
        const headers = forwardHeaders(req.headers);

        const response = await axios({
            method: 'POST',
            url: targetUrl,
            headers: headers,
            data: req.body,
            responseType: 'arraybuffer',
            validateStatus: () => true
        });

        const rawBuffer = response.data;
        const rawString = decodeArrayBufferToText(rawBuffer);
        
        console.log(`\n📦 [ASTUTE RESPONSE RECEIVED]`);
        console.log(`🔽 Body: ${rawString}`);

        let finalData = rawBuffer;

        // JSON දත්ත නම් Modify කරමු
        if (rawString.trim().startsWith('{')) {
            try {
                let originalJson = JSON.parse(rawString);
                
                // --- BYPASS LOGIC ---
                // Astute ලගේ Verification එක අයින් කරලා Status එක Success කරනවා
                originalJson.status = 0; 
                if (originalJson.need_verification) originalJson.need_verification = false;
                if (originalJson.verify_id) originalJson.verify_id = null;
                
                // ඔයාගේ Domain එක Core URL එකට දාන්න (Lobby එකට යන්න)
                originalJson.core_url = MY_DOMAIN;
                originalJson.core_port = 7006;

                finalData = Buffer.from(JSON.stringify(originalJson), 'utf8');
                console.log(`✅ Modified JSON sent to bypass verification!`);
            } catch (e) {
                console.log(`⚠️ Could not parse JSON for modification.`);
            }
        }

        res.status(response.status);
        Object.entries(response.headers).forEach(([key, value]) => {
            if (key.toLowerCase() !== 'content-length') res.setHeader(key, value);
        });
        res.send(finalData);

    } catch (error) {
        console.error('❌ MajorLogin proxy error:', error.message);
        res.status(502).send('Proxy error');
    }
});

// ─────────────────────────────────────────────────────────
// 2. Proxy + URL Rewriting for /ver.php
// ─────────────────────────────────────────────────────────
app.get('/ver.php', async (req, res) => {
    console.log(`\n🔎 [VER.PHP REQUEST]`);
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
        // URLs අපේ Domain එකට මාරු කරනවා
        modifiedBody = modifiedBody.replace(new RegExp(TARGET_SERVER, 'g'), MY_URL);
        modifiedBody = modifiedBody.replace(/gin\.freefiremobile\.com/g, MY_DOMAIN);

        res.status(response.status);
        res.send(modifiedBody);
        console.log(`✅ ver.php updated with ${MY_DOMAIN}`);
    } catch (error) {
        console.error('❌ ver.php proxy error:', error.message);
        res.status(502).send('Proxy error');
    }
});

// ─────────────────────────────────────────────────────────
// 3. Catch-All & TCP Server
// ─────────────────────────────────────────────────────────
app.all(/.*/, (req, res) => {
    if (req.path !== '/ver.php' && req.path !== '/MajorLogin') {
        console.log(`🔎 [OTHER PATH]: ${req.method} ${req.path}`);
    }
    res.status(200).send("OK");
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Proxy Running | Port: ${PORT} | Lobby: 7006`);
});

const tcpServer = net.createServer((socket) => {
    console.log(`\n📡 [TCP CONNECT] Client: ${socket.remoteAddress}`);
    socket.on('data', (data) => console.log(`📩 [TCP DATA]: ${data.length} bytes`));
});
tcpServer.listen(7006, '0.0.0.0');
