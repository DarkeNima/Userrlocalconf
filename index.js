const express = require('express');
const fs = require('fs');
const path = require('path');
const net = require('net');
const app = express();

const PORT = 80;
const MY_IP = "139.162.54.41";
const MY_URL = `http://navidu-ff.duckdns.org`;
const BINARY_FILE = path.join(__dirname, 'login_success.bin');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.disable('etag');

// 1. Version API - ගේම් එක හරියටම load වෙන්න මේ ටික ඕනේ
app.get('/ver.php', (req, res) => {
    console.log(`\n[!] VER.PHP REQUEST FROM: ${req.ip}`);
    
    const responseData = {
        "code": 0,
        "is_server_open": true,
        // Astutech එකේ තිබුණ original CDN URLs ටික මෙතනට දැම්මා
        "cdn_url": "http://dl.cdn.freefiremobile.com/live/ABHotUpdates/",
        "backup_cdn_url": "http://dl.cdn.freefiremobile.com/live/ABHotUpdates/",
        "abhotupdate_cdn_url": "http://dl-core.cdn.freefiremobile.com/live/ABHotUpdates/",
        "img_cdn_url": "http://dl.cdn.freefiremobile.com/common/",
        "login_download_optionalpack": "optionalallocres:49|optionalavatarres:757|optionalclothres:1184|optionalpetres:871",
        "need_track_hotupdate": true,
        "abhotupdate_check": "cache_res;assetindexer;SH-Gpp",
        "latest_release_version": "OB53",
        "min_hint_size": 1,
        "space_required_in_GB": 1.48,
        "should_check_ab_load": false,
        "remote_version": "1.123.8",
        "server_url": `${MY_URL}/`, // ගේම් එක මීළඟට කනෙක්ට් වෙන්නේ මේ URL එකට
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

    // JSON එක ගේම් එකට කියවිය හැකි විදිහට Slash (/) Escape කරලා යවමු
    const jsonResponse = JSON.stringify(responseData).replace(/\//g, '\\/');
    res.set({ 'Content-Type': 'application/json; charset=utf-8' });
    res.status(200).send(jsonResponse);
});

// 2. Ping API
app.post('/Ping', (req, res) => {
    res.status(200).send("OK");
});

// 3. MajorLogin API - මෙතනදී අපි සේව් කරපු 891 bytes බයිනරි එක යවනවා
app.post('/MajorLogin', (req, res) => {
    console.log(`\n🎯 [MAJOR LOGIN] Serving saved binary to: ${req.ip}`);
    
    if (fs.existsSync(BINARY_FILE)) {
        const binaryData = fs.readFileSync(BINARY_FILE);
        res.set({
            'Content-Type': 'application/octet-stream',
            'Connection': 'close'
        });
        res.status(200).send(binaryData);
        console.log(`✅ Success: Sent ${binaryData.length} bytes of login data.`);
    } else {
        console.error("❌ Error: login_success.bin not found!");
        res.status(500).send("Login data missing");
    }
});

// 4. Catch-All Logger
app.all(/.*/, (req, res) => {
    if (req.path === '/ver.php' || req.path === '/MajorLogin' || req.path === '/Ping') return;
    console.log(`🔎 [NEW PATH DETECTED]: ${req.method} ${req.path}`);
    res.status(200).send("OK"); 
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 PRIVATE SERVER ACTIVE ON PORT ${PORT}`);
});

// 5. TCP Core Listener (Lobby Connection)
const tcpServer = net.createServer((socket) => {
    console.log(`\n📡 [TCP CONNECT] Client entered Lobby: ${socket.remoteAddress}`);
    socket.on('data', (data) => {
        console.log(`📩 [LOBBY DATA]: ${data.length} bytes | HEX: ${data.toString('hex').substring(0, 50)}...`);
    });
});

tcpServer.listen(7006, '0.0.0.0', () => {
    console.log("🚀 TCP Core Listener active on Port 7006");
});
