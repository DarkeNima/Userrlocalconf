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

// 1. Version API - ඔයා එවපු අලුත් Response එක මෙතනට දැම්මා
app.get('/ver.php', (req, res) => {
    console.log(`\n[!] VER.PHP REQUEST FROM: ${req.ip}`);
    
    const responseData = {
        "code": 2, // ඔයා එවපු විදිහටම code 2 දැම්මා
        "use_login_optional_download": false,
        "use_background_download": false,
        "use_background_download_lobby": false,
        "country_code": "SG",
        "client_ip": req.ip.replace('::ffff:', ''),
        "gdpr_version": 0,
        "billboard_cdn_url": "",
        "billboard_msg": "",
        "web_url": "",
        "billboard_bg_url": "",
        "max_store": "",
        "max_web": "",
        "max_video": "",
        "patchnote_url": "",
        "multi_region": "",
        "appstore_url": "http://www.freefiremobile.com/",
        "backup_appstore_url": "",
        "garena_login": false,
        "garena_hint": false,
        "gop_url": "",
        "gamevar": "var_name,comment,var_type,var_value\nvar_name,comment,\"var_type float, int, bool\",var_value\nANODisabledRegions,\u5173\u95edMTP\u7684\u5730\u533a,string,\"IND,NA\"\nANODisabledClientVariant,ANODisabledClientVariant,string,\"ClientUsingVersion_MAX_HPE,ClientUsingVersion_FFI,ClientUsingVersion_MAX|IND,ClientUsingVersion_MAX|NA,ClientUsingVersion_NORMAL|NA\"\nEnableMtpLiteDataRegion,mtp\u8f7b\u7279\u5f81\u5f00\u5173,string,\"BR,EUROPE,ID,ME,US,RU,SAC,SG,TH,TW,VN,PK,ZA,BD\"\nANOEmulatorCheckDisbaledClientVariant,ANOEmulatorCheckDisbaledClientVariant,string,\"ClientUsingVersion_FFI,ClientUsingVersion_MAX,ClientUsingVersion_NORMAL\"\nForceTutorial_ChangeHudABTest,fps\u6d41\u7a0b\u4e2d\u6253\u5f00hud\u9009\u62e9\u754c\u9762\u7684\u6982\u7387,float,-1\n",
        "device_whitelist_version": "1.5.0",
        "whitelist_mask": 0,
        "device_whitelist_sp_version": "1.0.0",
        "whitelist_sp_mask": 0,
        "ggp_url": "gin.freefiremobile.com",
        "server_url": `${MY_URL}/`, // ඊළඟ පියවර සඳහා ඔයාගේ VPS එකට හරවනවා
        "core_url": MY_IP,
        "core_ip_list": [MY_IP, "0.0.0.0"]
    };

    const jsonResponse = JSON.stringify(responseData).replace(/\//g, '\\/');
    res.set({ 'Content-Type': 'application/json; charset=utf-8' });
    res.status(200).send(jsonResponse);
});

// 2. Ping API
app.post('/Ping', (req, res) => {
    res.status(200).send("OK");
});

// 3. MajorLogin API - මෙතනදී තමයි 400 Error එක Bypass වෙන්නේ
app.post('/MajorLogin', (req, res) => {
    console.log(`\n🎯 [MAJOR LOGIN] Hijacking with saved binary: ${req.ip}`);
    
    if (fs.existsSync(BINARY_FILE)) {
        const binaryData = fs.readFileSync(BINARY_FILE);
        res.set({
            'Content-Type': 'application/octet-stream',
            'Connection': 'close'
        });
        res.status(200).send(binaryData);
        console.log(`✅ Sent ${binaryData.length} bytes. Game should enter lobby now.`);
    } else {
        res.status(500).send("Login data missing");
    }
});

// 4. Catch-All Logger
app.all(/.*/, (req, res) => {
    if (req.path === '/ver.php' || req.path === '/MajorLogin' || req.path === '/Ping') return;
    console.log(`🔎 [NEW PATH]: ${req.method} ${req.path}`);
    res.status(200).send("OK"); 
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 PRIVATE SERVER IS ONLINE ON PORT ${PORT}`);
});

// 5. TCP Core Listener (Port 7006)
const tcpServer = net.createServer((socket) => {
    console.log(`\n📡 [TCP CONNECT] Lobby Entry: ${socket.remoteAddress}`);
    socket.on('data', (data) => {
        console.log(`📩 [TCP DATA]: ${data.length} bytes`);
    });
});
tcpServer.listen(7006, '0.0.0.0');
