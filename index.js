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
// 0. GLOBAL LOGGING MIDDLEWARE (හැමදේම බලන්න)
// ─────────────────────────────────────────────────────────

app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: true, verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(express.raw({ type: '*/*', limit: '10mb', verify: (req, res, buf) => { req.rawBody = buf; } }));

app.use((req, res, next) => {
    console.log(`\n📡 [INCOMING] ${req.method} ${req.url}`);
    if (req.rawBody) {
        console.log(`📦 Body (${req.rawBody.length} bytes): ${req.rawBody.toString('utf8').substring(0, 500)}`);
    }
    
    const originalSend = res.send;
    res.send = function(body) {
        if (req.url.includes('login') || req.url.includes('auth') || req.url.includes('major') || req.url.includes('ver')) {
            console.log(`🔁 [RESPONSE FROM ${req.url}]:`);
            console.log(Buffer.isBuffer(body) ? body.toString('utf8').substring(0, 1000) : String(body).substring(0, 1000));
        }
        originalSend.call(this, body);
    };
    next();
});

// Helper: Headers Forward කිරීම
function forwardHeaders(originalHeaders) {
    const headers = { ...originalHeaders };
    delete headers.host;
    delete headers['content-length'];
    return headers;
}

// ─────────────────────────────────────────────────────────
// 1. Proxy Routes
// ─────────────────────────────────────────────────────────

// ver.php Proxy
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
    } catch (e) { res.status(502).send("Proxy Error"); }
});

// All-in-One Proxy (MajorLogin ඇතුළුව ඕනෑම path එකක් Astute එකට forward කරයි)
app.all('/*', async (req, res) => {
    if (req.path === '/ver.php') return;
    try {
        const response = await axios({
            method: req.method,
            url: `${TARGET_SERVER}${req.url}`,
            headers: forwardHeaders(req.headers),
            data: req.rawBody,
            responseType: 'arraybuffer',
            validateStatus: () => true
        });
        res.status(response.status).send(response.data);
    } catch (e) { res.status(502).send("Proxy Error"); }
});

// ─────────────────────────────────────────────────────────
// 2. Server Start
// ─────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Proxy running on Port ${PORT}`);
});

const tcpServer = net.createServer((socket) => {
    socket.on('data', (data) => console.log(`📩 [TCP DATA]: ${data.length} bytes`));
});
tcpServer.listen(7006, '0.0.0.0');
