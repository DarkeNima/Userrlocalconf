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

// ─────────────────────────────────────────────────────────
// SSL certificates (Let's Encrypt)
// ─────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────
// Middleware – ensure raw body is not parsed for /MajorLogin
// We'll handle /MajorLogin separately without body parsers
// ─────────────────────────────────────────────────────────
app.use(express.json());    // only for other routes
app.use(express.urlencoded({ extended: true }));
app.disable('etag');

// ─────────────────────────────────────────────────────────
// 1. /ver.php – dynamic JSON with required modifications
// ─────────────────────────────────────────────────────────
app.get('/ver.php', (req, res) => {
    console.log(`\n[VER.PHP] Request from ${req.ip}`);

    // Base JSON (exactly as captured, but we will modify fields)
    const verData = {
        "code": 2,  // will change to 0
        "use_login_optional_download": false,
        "use_background_download": false,
        "use_background_download_lobby": false,
        "country_code": "SG",
        "client_ip": "15.235.211.216", // will replace
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
        "ggp_url": "gin.freefiremobile.com"
    };

    // Apply required modifications
    verData.code = 0;
    verData.server_url = `${MY_URL_HTTPS}/`;
    verData.core_url = MY_IP;
    verData.ggp_url = MY_IP;
    // Update client_ip to the real requester's IP
    let clientIp = req.ip;
    if (clientIp.startsWith('::ffff:')) clientIp = clientIp.substring(7);
    verData.client_ip = clientIp;

    const jsonResponse = JSON.stringify(verData);
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(jsonResponse);
    console.log(`✅ Sent ver.php (code:0, server_url:${verData.server_url})`);
});

// ─────────────────────────────────────────────────────────
// 2. /Ping – simple OK response
// ─────────────────────────────────────────────────────────
app.post('/Ping', (req, res) => {
    console.log(`📡 [PING]`);
    res.status(200).send("OK");
});

// ─────────────────────────────────────────────────────────
// 3. /MajorLogin – serve saved binary with safe error handling
//    Note: We disable body parsing for this route to avoid conflicts
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
// 4. Catch‑all for any other routes (log only)
// ─────────────────────────────────────────────────────────
app.all('*', (req, res) => {
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
        // For full independence, implement game packet handling here
        // Currently just logs and discards
    });
    socket.on('error', (err) => {
        console.log(`❌ TCP error from ${clientAddr}: ${err.message}`);
    });
    socket.on('close', () => {
        console.log(`🔌 TCP connection closed: ${clientAddr}`);
    });
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
console.log(`📦 /ver.php returns code:0, server_url: ${MY_URL_HTTPS}/`);
