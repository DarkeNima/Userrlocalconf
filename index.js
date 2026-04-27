const express = require('express');
const axios = require('axios');
const net = require('net');
const app = express();
const PORT = 80;

// ✅ ඔයාගේ VPS දත්ත
const MY_DOMAIN = 'navidu-ff.duckdns.org';
const MY_URL = `http://${MY_DOMAIN}`;
const TARGET_SERVER = 'https://version.astutech.online';

// Body parsing settings
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: true, verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(express.raw({ type: '*/*', limit: '10mb', verify: (req, res, buf) => { req.rawBody = buf; } }));

// ─────────────────────────────────────────────────────────
// 0. GLOBAL LOGGING MIDDLEWARE
// ─────────────────────────────────────────────────────────
app.use((req, res, next) => {
    console.log(`\n📡 [INCOMING] ${req.method} ${req.originalUrl}`);
    
    const originalSend = res.send;
    res.send = function(body) {
        // ලොගින් වලට අදාළ දේවල් විතරක් ලොග් කරනවා
        const pathsToLog = ['login', 'auth', 'major', 'ver', 'lobby'];
        if (pathsToLog.some(path => req.originalUrl.includes(path))) {
            console.log(`\n🔁 [RESPONSE FROM ${req.originalUrl}]:`);
            const output = Buffer.isBuffer(body) ? body.toString('utf8') : String(body);
            console.log(output.substring(0, 1500)); 
        }
        originalSend.call(this, body);
    };
    next();
});

function forwardHeaders(originalHeaders) {
    const headers = { ...originalHeaders };
    delete headers.host;
    delete headers['content-length'];
    return headers;
}

// ─────────────────────────────────────────────────────────
// 1. SPECIFIC ROUTES (මුලින්ම ver.php අල්ලගන්නවා)
// ─────────────────────────────────────────────────────────

app.get('/ver.php', async (req, res) => {
    try {
        const response = await axios({
            method: 'GET',
            url: `${TARGET_SERVER}/ver.php?${new URLSearchParams(req.query).toString()}`,
            headers: forwardHeaders(req.headers),
            responseType: 'text'
        });
        let modified = response.data.replace(new RegExp(TARGET_SERVER, 'g'), MY_URL);
        modified = modified.replace(/gin\.freefiremobile\.com/g, MY_DOMAIN);
        res.send(modified);
        console.log(`✅ ver.php modified and sent.`);
    } catch (e) { 
        console.error("❌ ver.php error:", e.message);
        res.status(502).send("Proxy Error"); 
    }
});

// ─────────────────────────────────────────────────────────
// 2. CATCH-ALL PROXY (අනිත් හැම එකක්ම මෙතනට එනවා)
// ─────────────────────────────────────────────────────────

app.use(async (req, res) => {
    try {
        const response = await axios({
            method: req.method,
            url: `${TARGET_SERVER}${req.originalUrl}`,
            headers: forwardHeaders(req.headers),
            data: req.rawBody,
            responseType: 'arraybuffer',
            validateStatus: () => true
        });

        // Headers ටික එහෙම්ම යවනවා
        res.status(response.status);
        Object.entries(response.headers).forEach(([key, value]) => {
            if (key.toLowerCase() !== 'content-length') res.setHeader(key, value);
        });
        
        res.send(response.data);
    } catch (e) { 
        console.error(`❌ Proxy error on ${req.originalUrl}:`, e.message);
        res.status(502).send("Proxy Error"); 
    }
});

// ─────────────────────────────────────────────────────────
// 3. SERVER START
// ─────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Proxy is LIVE on Port ${PORT}`);
    console.log(`🔎 Ready to catch those secret lobby logs!`);
});

const tcpServer = net.createServer((socket) => {
    socket.on('data', (data) => console.log(`📩 [TCP DATA]: ${data.length} bytes`));
});
tcpServer.listen(7006, '0.0.0.0');
