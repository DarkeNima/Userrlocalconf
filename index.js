const express = require('express');
const fs = require('fs');
const path = require('path');
const net = require('net');
const app = express();
const PORT = 80;

const MY_IP = "139.162.54.41";
const MY_DOMAIN = "navidu-ff.duckdns.org";
const MY_URL = `http://${MY_DOMAIN}`;

// Path to your saved successful login binary
const LOGIN_SUCCESS_FILE = path.join(__dirname, 'login_success.bin');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.disable('etag');

// 1. Version API (ver.php) – you already have a working version
app.get('/ver.php', (req, res) => {
    console.log(`\n[VER.PHP] Request from ${req.ip}`);
    
    const responseData = {
        "code": 0,
        "is_server_open": true,
        "cdn_url": "http://dl.cdn.freefiremobile.com/live/ABHotUpdates/",
        "backup_cdn_url": "http://dl.cdn.freefiremobile.com/live/ABHotUpdates/",
        "abhotupdate_cdn_url": "http://dl-core.cdn.freefiremobile.com/live/ABHotUpdates/",
        "img_cdn_url": "http://dl.cdn.freefiremobile.com/common/",
        "login_download_optionalpack": "optionalclothres:shaders|optionalpetres:optionalpetres_commonab_shader|optionallobbyres:",
        "need_track_hotupdate": true,
        "abhotupdate_check": "cache_res;assetindexer;SH-Gpp",
        "latest_release_version": "OB53",
        "min_hint_size": 1,
        "space_required_in_GB": 1.48,
        "should_check_ab_load": false,
        "remote_version": "1.123.8",
        "server_url": `${MY_URL}/`,
        "country_code": "SG",
        "client_ip": req.ip.replace('::ffff:', ''),
        "billboard_cdn_url": "http://dl.dir.freefiremobile.com/common/OB53/CSH/patchupdate/sghfuHFHf101.ff_extend",
        "login_failed_count": 0,
        "core_url": MY_IP,
        "core_ip_list": [MY_IP, "0.0.0.0"],
        "ggp_url": MY_IP,
        "remote_option_version": "optionallocres:49|optionalavatarres:757|optionalclothres:1184|optionalpetres:871",
        "remote_option_version_astc": "optionallocres:49|optionalavatarres:719|optionalclothres:1184|optionalpetres:871"
    };

    const jsonResponse = JSON.stringify(responseData).replace(/\//g, '\\/');
    res.set({ 'Content-Type': 'application/json; charset=utf-8' });
    res.status(200).send(jsonResponse);
});

// 2. Ping API – game may expect binary or "OK"
app.post('/Ping', (req, res) => {
    console.log(`\n📡 [PING]`);
    // Return "OK" as plain text; if game expects binary, change later
    res.status(200).send("OK");
});

// 3. MajorLogin API – serve the saved binary (no JSON construction!)
app.post('/MajorLogin', (req, res) => {
    console.log(`\n🎯 [MAJOR LOGIN] from ${req.ip}`);

    if (!fs.existsSync(LOGIN_SUCCESS_FILE)) {
        console.error(`❌ Login success binary not found at ${LOGIN_SUCCESS_FILE}`);
        return res.status(500).send("Missing login data");
    }

    try {
        const binaryData = fs.readFileSync(LOGIN_SUCCESS_FILE);
        console.log(`✅ Sending saved login response (${binaryData.length} bytes)`);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.status(200).send(binaryData);
    } catch (err) {
        console.error(`❌ Failed to read login binary:`, err.message);
        res.status(500).send("Internal error");
    }
});

// 4. Catch-all logger for unknown paths
app.all(/.*/, (req, res) => {
    if (req.path === '/ver.php' || req.path === '/MajorLogin' || req.path === '/Ping') return;
    console.log(`\n🔎 [NEW PATH] ${req.method} ${req.path}`);
    res.status(200).send("OK");
});

// Start HTTP server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Independent server running on port ${PORT}`);
    console.log(`🔗 URL: ${MY_URL}`);
    console.log(`📦 /MajorLogin will serve saved binary from ${LOGIN_SUCCESS_FILE}`);
});

// TCP Core Listener (port 7006)
const tcpServer = net.createServer((socket) => {
    console.log(`\n📡 [TCP CONNECT] ${socket.remoteAddress}`);
    socket.on('data', (data) => {
        console.log(`📩 [TCP DATA] ${data.length} bytes`);
        // You may need to implement game packet handling here
    });
    socket.on('error', (err) => console.log(`❌ TCP error: ${err.message}`));
});
tcpServer.listen(7006, '0.0.0.0', () => {
    console.log("🚀 TCP Core listening on port 7006");
});
