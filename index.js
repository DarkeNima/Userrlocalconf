const express = require('express');
const app = express();
const PORT = 80;

// ✅ මෙතනට ඔයාගේ ඇත්තම දත්ත දාන්න
const MY_URL = "https://navidu-ff.duckdns.org"; 
const MY_IP = "139.162.54.41";

app.use(express.json());
app.disable('etag');

// 1. Version API
app.get('/ver.php', (req, res) => {
    console.log(`\n[!] VER.PHP REQUEST RECEIVED FROM: ${req.ip}`);
    
    const responseData = {
        "code": 0,
        "is_server_open": true,
        "is_firewall_open": false,
        "cdn_url": "https://dl.cdn.freefiremobile.com/live/ABHotUpdates/",
        "backup_cdn_url": "https://dl.cdn.freefiremobile.com/live/ABHotUpdates/",
        "abhotupdate_cdn_url": "https://dl-core.cdn.freefiremobile.com/live/ABHotUpdates/",
        "img_cdn_url": "https://dl.cdn.freefiremobile.com/common/",
        "login_download_optionalpack": "optionalclothres:shaders|optionalpetres:optionalpetres_commonab_shader|optionallobbyres:",
        "need_track_hotupdate": true,
        "abhotupdate_check": "cache_res;assetindexer;SH-Gpp",
        "latest_release_version": "OB53",
        "min_hint_size": 1,
        "space_required_in_GB": 1.48,
        "should_check_ab_load": false,
        "force_refresh_restype": "optionalavatarres",
        "remote_version": "1.123.8",
        "server_url": `${MY_URL}/`, 
        "is_review_server": false,
        "use_login_optional_download": true,
        "use_background_download": false,
        "use_background_download_lobby": false,
        "country_code": "SG",
        "client_ip": req.ip.replace('::ffff:', ''),
        "gdpr_version": 0,
        "billboard_cdn_url": "https://dl.dir.freefiremobile.com/common/OB53/CSH/patchupdate/sghfuHFHf101.ff_extend",
        "billboard_msg": "",
        "web_url": "",
        "billboard_bg_url": "https://dl.cdn.freefiremobile.com/common/OB23/version/Patch_Bg.png",
        "max_store": "",
        "max_web": "",
        "max_video": "",
        "patchnote_url": "https://dl.dir.freefiremobile.com/common/web_event/aswqooiwd/EnlyjW26.html?lang=en",
        "multi_region": "",
        "need_check_ip_list": [],
        "network_log_server": "https://sgnetwork.ggblueshark.com/",
        "web_log_server": "https://networkselftest.ff.garena.com/api/",
        "login_failed_count": 2,
        "test_url": "",
        "core_url": "navidu-ff.duckdns.org", // මෙතනටත් DuckDNS එක දෙන්න
        "core_ip_list": [MY_IP, "0.0.0.0"], 
        "appstore_url": "http://www.freefiremobile.com/",
        "backup_appstore_url": "",
        "garena_login": false,
        "garena_hint": false,
        "gop_url": "",
        "gamevar": "var_name,comment,var_type,var_value\nANODisabledRegions,string,\"IND,NA\"\nANODisabledClientVariant,string,\"ClientUsingVersion_MAX_HPE,ClientUsingVersion_FFI,ClientUsingVersion_MAX|IND,ClientUsingVersion_MAX|NA,ClientUsingVersion_NORMAL|NA\"\nEnableMtpLiteDataRegion,string,\"BR,EUROPE,ID,ME,US,RU,SAC,SG,TH,TW,VN,PK,ZA,BD\"\n",
        "device_whitelist_version": "1.5.0",
        "whitelist_mask": 0,
        "device_whitelist_sp_version": "1.0.0",
        "whitelist_sp_mask": 0,
        "ggp_url": "navidu-ff.duckdns.org", // මෙතනටත් DuckDNS එක දෙන්න
        "remote_option_version": "optionallocres:49|optionalavatarres:757|optionalclothres:1184|optionalpetres:871", 
        "remote_option_version_astc": "optionallocres:49|optionalavatarres:719|optionalclothres:1184|optionalpetres:871"
    };

    // Slash escape කරන කොටස
    const jsonResponse = JSON.stringify(responseData).replace(/\//g, '\\/');

    res.set({
        'Content-Type': 'application/json; charset=utf-8',
        'Server': 'cloudflare'
    });

    res.status(200).send(jsonResponse);
});

// 2. Catch-All Logger
// මේ විදියට වෙනස් කරන්න
// කෙලින්ම RegExp object එකක් පාවිච්චි කරන්න
app.all(/.*/, (req, res) => {
    if (req.path === '/ver.php') return;

    console.log(`\n🎯 [NEW PATH DETECTED]: ${req.method} ${req.path}`);
    console.log(`📡 Headers:`, JSON.stringify(req.headers));
    
    if (req.body && Object.keys(req.body).length > 0) {
        console.log(`📦 Body:`, JSON.stringify(req.body));
    }

    res.status(200).send("OK"); 
});



app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Logger Server is running on Port ${PORT}`);
    console.log(`🔎 VPS IP: ${MY_IP}`);
});

const net = require('net');

// ලොබී එකට එන සම්බන්ධතා අල්ලන්න
const tcpServer = net.createServer((socket) => {
    console.log(`\n📡 [TCP CONNECT] Client connected from: ${socket.remoteAddress}`);

    socket.on('data', (data) => {
        console.log(`📩 [TCP DATA RECEIVED]: ${data.length} bytes`);
        console.log(`📦 Hex: ${data.toString('hex')}`);
    });

    socket.on('error', (err) => {
        console.log(`❌ [TCP ERROR]: ${err.message}`);
    });
});

// Port 10001 හෝ ගේම් එක බලාපොරොත්තු වන port එකක්
tcpServer.listen(10001, '0.0.0.0', () => {
    console.log("🚀 TCP Core Listener is active on Port 10001");
});

