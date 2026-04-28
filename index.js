const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const net = require('net');
const path = require('path');

const app = express();
const HTTP_PORT = 80;
const HTTPS_PORT = 443;
const TCP_PORT = 7006;
const MY_DOMAIN = 'navidu-ff.duckdns.org';
const MY_IP = '139.162.54.41';
const MY_URL_HTTPS = `https://${MY_DOMAIN}`;
const LOGIN_BIN_FILE = path.join(__dirname, 'login_success.bin');

// SSL certificates
let sslOptions;
try {
    sslOptions = {
        key: fs.readFileSync(`/etc/letsencrypt/live/${MY_DOMAIN}/privkey.pem`),
        cert: fs.readFileSync(`/etc/letsencrypt/live/${MY_DOMAIN}/fullchain.pem`)
    };
    console.log('✅ SSL certificates loaded');
} catch (err) {
    console.error('❌ Failed to load SSL certificates:', err.message);
    process.exit(1);
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.disable('etag');

// ─────────────────────────────────────────────────────────
// 1. /ver.php – COMPLETE JSON with all required fields
// ─────────────────────────────────────────────────────────
app.get('/ver.php', (req, res) => {
    console.log(`\n[VER.PHP] Request from ${req.ip}`);

    // This is the FULL response that Astute returns (with modifications)
    const verData = {
        "code": 0,                                // CRITICAL: 0 = success
        "is_server_open": true,                  // CRITICAL: otherwise "maintenance"
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

    // Update client_ip with the real requester's IP
    let clientIp = req.ip;
    if (clientIp.startsWith('::ffff:')) clientIp = clientIp.substring(7);
    verData.client_ip = clientIp;

    const jsonResponse = JSON.stringify(verData);
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(jsonResponse);
    console.log(`✅ Sent full ver.php (is_server_open:true, server_url:${verData.server_url})`);
});

// ─────────────────────────────────────────────────────────
// 2. /Ping – simple OK response
// ─────────────────────────────────────────────────────────
app.post('/Ping', (req, res) => {
    console.log(`📡 [PING]`);
    res.status(200).send("OK");
});

// ─────────────────────────────────────────────────────────
// 3. /MajorLogin – serve saved binary
// ─────────────────────────────────────────────────────────
app.post('/MajorLogin', (req, res) => {
    console.log(`\n🎯 [MAJOR LOGIN] from ${req.ip}`);
    if (!fs.existsSync(LOGIN_BIN_FILE)) {
        console.error(`❌ Missing ${LOGIN_BIN_FILE}`);
        return res.status(500).send('Login data not available');
    }
    try {
        const binaryData = fs.readFileSync(LOGIN_BIN_FILE);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.status(200).send(binaryData);
        console.log(`✅ Sent login binary (${binaryData.length} bytes)`);
    } catch (err) {
        console.error(`❌ Error reading binary:`, err.message);
        res.status(500).send('Internal error');
    }
});

// ─────────────────────────────────────────────────────────
// 4. Catch-all for unknown routes (Express 5 compatible)
// ─────────────────────────────────────────────────────────
app.all('/*splat', (req, res) => {
    if (['/ver.php', '/MajorLogin', '/Ping'].includes(req.path)) return;
    console.log(`🔎 [OTHER PATH] ${req.method} ${req.path}`);
    res.status(200).send("OK");
});

// ─────────────────────────────────────────────────────────
// 5. TCP Core Server (port 7006)
// ─────────────────────────────────────────────────────────
const tcpServer = net.createServer((socket) => {
    const clientAddr = socket.remoteAddress;
    console.log(`\n📡 [TCP CONNECT] ${clientAddr}`);
    socket.on('data', (data) => {
        console.log(`📩 [TCP DATA] ${data.length} bytes from ${clientAddr}`);
        // TODO: implement game packet handling (for now just log)
    });
    socket.on('error', (err) => console.log(`❌ TCP error: ${err.message}`));
    socket.on('close', () => console.log(`🔌 TCP closed: ${clientAddr}`));
});
tcpServer.listen(TCP_PORT, '0.0.0.0', () => {
    console.log(`🚀 TCP Core listening on port ${TCP_PORT}`);
});

// ─────────────────────────────────────────────────────────
// 6. Start HTTP and HTTPS servers
// ─────────────────────────────────────────────────────────
http.createServer(app).listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`🌐 HTTP server listening on port ${HTTP_PORT}`);
});

https.createServer(sslOptions, app).listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`🔒 HTTPS server listening on port ${HTTPS_PORT}`);
});

console.log(`\n🚀 INDEPENDENT SERVER FULLY RUNNING`);
console.log(`🔗 Base URL: ${MY_URL_HTTPS}`);
console.log(`📦 /MajorLogin reads: ${LOGIN_BIN_FILE}`);
console.log(`📦 /ver.php returns is_server_open:true, code:0, server_url: ${MY_URL_HTTPS}/`);
