const express = require('express');
const app = express();
const PORT = 80;

// ✅ VPS දත්ත
const MY_IP = "139.162.54.41";
const MY_URL = `http://navidu-ff.duckdns.org`;

app.use(express.urlencoded({ extended: true })); // Form-data කියවන්න (MajorLogin සඳහා)
app.use(express.json());
app.disable('etag');

// 1. Version API
app.get('/ver.php', (req, res) => {
    console.log(`\n[!] VER.PHP REQUEST RECEIVED FROM: ${req.ip}`);
    
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

// 2. Ping API
app.post('/Ping', (req, res) => {
    console.log(`\n📡 [PING RECEIVED]`);
    res.status(200).send("OK");
});

// 3. MajorLogin API - මෙන්න මෙතන තමයි Error එක එන්නේ
app.post('/MajorLogin', (req, res) => {
    console.log(`\n🎯 [MAJOR LOGIN ATTEMPT]: ${req.ip}`);
    
    // ගේම් එක බලාපොරොත්තු වන Valid JSON Response එක
    const loginResponse = {
        "code": 0,
        "message": "Success",
        "data": {
            "account_id": "123456789",
            "session_key": "fake_session_001",
            "nickname": "Navidu_Pro",
            "level": 75,
            "region": "SG",
            "is_guest": false,
            "core_url": MY_IP,
            "core_port": 7006
        }
    };

    res.set({ 'Content-Type': 'application/json; charset=utf-8' });
    res.status(200).json(loginResponse);
});

// 4. Catch-All Logger (අලුත් පාරවල් අඳුරගන්න)
app.all(/.*/, (req, res) => {
    if (req.path === '/ver.php' || req.path === '/MajorLogin' || req.path === '/Ping') return;

    console.log(`\n🔎 [NEW PATH DETECTED]: ${req.method} ${req.path}`);
    console.log(`📡 Headers:`, JSON.stringify(req.headers));
    
    if (req.body && Object.keys(req.body).length > 0) {
        console.log(`📦 Body:`, JSON.stringify(req.body));
    }

    res.status(200).send("OK"); 
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 HTTP Logger Server is running on Port ${PORT}`);
});

// TCP Core Listener
const net = require('net');
const tcpServer = net.createServer((socket) => {
    console.log(`\n📡 [TCP CONNECT] Client: ${socket.remoteAddress}`);
    socket.on('data', (data) => {
        console.log(`📩 [TCP DATA]: ${data.length} bytes | HEX: ${data.toString('hex')}`);
    });
});

tcpServer.listen(7006, '0.0.0.0', () => {
    console.log("🚀 TCP Core Listener is active on Port 7006");
});
