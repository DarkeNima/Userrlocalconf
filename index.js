const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const net = require('net');
const axios = require('axios');

const app = express();
const HTTP_PORT = 80;
const HTTPS_PORT = 443;
const TCP_PORT = 7006;
const MY_DOMAIN = 'navidu-ff.duckdns.org';
const MY_IP = '139.162.54.41';
const MY_URL_HTTPS = `https://${MY_DOMAIN}`;
const TARGET_API = 'https://srv0010.astutech.online';

// SSL certificates
let sslOptions;
try {
    sslOptions = {
        key: fs.readFileSync(`/etc/letsencrypt/live/${MY_DOMAIN}/privkey.pem`),
        cert: fs.readFileSync(`/etc/letsencrypt/live/${MY_DOMAIN}/fullchain.pem`)
    };
    console.log('✅ SSL certificates loaded');
} catch (err) {
    console.error('❌ SSL error:', err.message);
    process.exit(1);
}

// Helper to forward headers (remove host & content-length)
function forwardHeaders(headers) {
    const h = { ...headers };
    delete h.host;
    delete h['content-length'];
    return h;
}

// Axios instance for proxying (ignore SSL errors)
const axiosInstance = axios.create({
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
});

// Body parsing for local routes (not needed for proxied ones)
app.use(express.raw({ type: '*/*', limit: '10mb' }));
app.disable('etag');

// ─────────────────────────────────────────────────────────
// 1. /ver.php – full static JSON (no expiration issues)
// ─────────────────────────────────────────────────────────
app.get('/ver.php', (req, res) => {
    console.log(`\n[VER.PHP] Request from ${req.ip}`);

    const verData = {
        "code": 0,
        "is_server_open": true,
        "is_firewall_open": false,
        "cdn_url": "https://dl-tata.freefireind.in/live/ABHotUpdates/",
        "backup_cdn_url": "https://dl-tata.freefireind.in/live/ABHotUpdates/",
        "abhotupdate_cdn_url": "https://core-tata.freefireind.in/live/ABHotUpdates/",
        "img_cdn_url": "https://dl-tata.freefireind.in/common/",
        "login_download_optionalpack": "optionalclothres:shaders|optionalpetres:optionalpetres_commonab_shader|optionallobbyres:",
        "need_track_hotupdate": true,
        "abhotupdate_check": "cache_res;assetindexer;SH-Gpp",
        "latest_release_version": "OB53",
        "min_hint_size": 1,
        "space_required_in_GB": 1.48,
        "should_check_ab_load": false,
        "force_refresh_restype": "optionalavatarres",
        "remote_version": "1.123.8",
        "server_url": `${MY_URL_HTTPS}/`,
        "is_review_server": false,
        "use_login_optional_download": true,
        "use_background_download": false,
        "use_background_download_lobby": false,
        "country_code": "SG",
        "client_ip": "0.0.0.0",
        "gdpr_version": 0,
        "billboard_cdn_url": "https://dl-tata.freefireind.in/common/OB53/CSH/patchupdate/indhfuHFHf101.ff_extend;https://dl-tata.freefireind.in/common/OB53/CSH/patchupdate/indhfuHFHf102.ff_extend;https://dl-tata.freefireind.in/common/OB53/CSH/patchupdate/indhfuHFHf103.ff_extend;https://dl-tata.freefireind.in/common/OB53/CSH/patchupdate/indhfuHFHf104.ff_extend;https://dl-tata.freefireind.in/common/OB53/CSH/patchupdate/indhfuHFHf105.ff_extend",
        "ggp_url": MY_IP,
        "core_url": MY_IP,
        "core_ip_list": [MY_IP, "0.0.0.0"]
    };

    let clientIp = req.ip;
    if (clientIp.startsWith('::ffff:')) clientIp = clientIp.substring(7);
    verData.client_ip = clientIp;

    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(verData);
    console.log(`✅ Sent ver.php (is_server_open:true)`);
});

// ─────────────────────────────────────────────────────────
// 2. Proxy /MajorLogin to Astute (fresh session every time)
// ─────────────────────────────────────────────────────────
app.post('/MajorLogin', async (req, res) => {
    console.log(`\n🎯 [PROXY /MajorLogin] from ${req.ip}`);
    try {
        const targetUrl = `${TARGET_API}/MajorLogin`;
        const response = await axiosInstance({
            method: 'POST',
            url: targetUrl,
            headers: forwardHeaders(req.headers),
            data: req.body,
            responseType: 'arraybuffer',
            validateStatus: () => true
        });
        res.status(response.status);
        Object.entries(response.headers).forEach(([k, v]) => {
            if (k.toLowerCase() !== 'content-length') res.setHeader(k, v);
        });
        res.send(response.data);
        console.log(`✅ Forwarded /MajorLogin (status ${response.status})`);
    } catch (err) {
        console.error(`❌ Proxy error:`, err.message);
        res.status(502).send('Proxy error');
    }
});

// ─────────────────────────────────────────────────────────
// 3. Proxy /Ping to Astute (keeps session alive)
// ─────────────────────────────────────────────────────────
app.post('/Ping', async (req, res) => {
    console.log(`📡 [PROXY /Ping]`);
    try {
        const targetUrl = `${TARGET_API}/Ping`;
        const response = await axiosInstance({
            method: 'POST',
            url: targetUrl,
            headers: forwardHeaders(req.headers),
            data: req.body,
            responseType: 'arraybuffer',
            validateStatus: () => true
        });
        res.status(response.status);
        Object.entries(response.headers).forEach(([k, v]) => {
            if (k.toLowerCase() !== 'content-length') res.setHeader(k, v);
        });
        res.send(response.data);
    } catch (err) {
        console.error(`❌ Ping proxy error:`, err.message);
        res.status(502).send('OK'); // fallback
    }
});

// ─────────────────────────────────────────────────────────
// 4. Catch-all (Express 5 compatible)
// ─────────────────────────────────────────────────────────
app.all('/*splat', (req, res) => {
    if (['/ver.php', '/MajorLogin', '/Ping'].includes(req.path)) return;
    console.log(`🔎 [OTHER] ${req.method} ${req.path}`);
    res.status(200).send("OK");
});

// ─────────────────────────────────────────────────────────
// 5. TCP Core Listener (port 7006)
// ─────────────────────────────────────────────────────────
const tcpServer = net.createServer((socket) => {
    const addr = socket.remoteAddress;
    console.log(`\n📡 [TCP CONNECT] ${addr}`);
    socket.on('data', (data) => {
        console.log(`📩 [TCP DATA] ${data.length} bytes from ${addr}`);
    });
    socket.on('error', (err) => console.log(`❌ TCP error: ${err.message}`));
});
tcpServer.listen(TCP_PORT, '0.0.0.0', () => console.log(`🚀 TCP Core on ${TCP_PORT}`));

// ─────────────────────────────────────────────────────────
// 6. Start HTTP & HTTPS servers
// ─────────────────────────────────────────────────────────
http.createServer(app).listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`🌐 HTTP on ${HTTP_PORT}`);
});
https.createServer(sslOptions, app).listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`🔒 HTTPS on ${HTTPS_PORT}`);
});

console.log(`\n🚀 SERVER READY`);
console.log(`🔗 ${MY_URL_HTTPS}`);
console.log(`📡 /MajorLogin → ${TARGET_API}/MajorLogin (fresh session)`);
