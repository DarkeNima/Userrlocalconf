const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const net = require('net');

const app = express();
const MY_DOMAIN = 'navivpn.sytes.net';
const MY_IP = '103.6.168.170';
const MY_URL_HTTPS = `https://${MY_DOMAIN}`;
const TCP_PORT = 7006;

// Global variable to store real game server address (set by routes.js)
global.realGameServerAddress = null; // format: "IP:PORT"

// SSL Certificates
const sslOptions = {
    key: fs.readFileSync(`/etc/letsencrypt/live/${MY_DOMAIN}/privkey.pem`),
    cert: fs.readFileSync(`/etc/letsencrypt/live/${MY_DOMAIN}/fullchain.pem`)
};

// Middleware: Raw Body Capture
app.use((req, res, next) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => { req.rawBody = Buffer.concat(chunks); next(); });
});

// 🌐 [ver.php] 
app.get('/ver.php', (req, res) => {
    const clientIp = req.ip.replace('::ffff:', '');
    const verData = {
        "code": 0, "is_server_open": true, "is_firewall_open": false,
        "cdn_url": "https://dl-tata.freefireind.in/live/ABHotUpdates/",
        "backup_cdn_url": "https://dl-tata.freefireind.in/live/ABHotUpdates/",
        "abhotupdate_cdn_url": "https://core-tata.freefireind.in/live/ABHotUpdates/",
        "img_cdn_url": "https://dl-tata.freefireind.in/common/",
        "login_download_optionalpack": "optionalclothres:shaders|optionalpetres:optionalpetres_commonab_shader|optionallobbyres:",
        "need_track_hotupdate": true, "abhotupdate_check": "cache_res;assetindexer;SH-Gpp",
        "latest_release_version": "OB53", "min_hint_size": 1, "space_required_in_GB": 1.48,
        "should_check_ab_load": false, "force_refresh_restype": "optionalavatarres",
        "remote_version": "1.123.8",
        "server_url": `${MY_URL_HTTPS}/`, 
        "is_review_server": false, "use_login_optional_download": true,
        "use_background_download": false, "use_background_download_lobby": false,
        "country_code": "SG", "client_ip": clientIp, "gdpr_version": 0,
        "billboard_cdn_url": "https://dl-tata.freefireind.in/common/OB53/CSH/patchupdate/indhfuHFHf101.ff_extend",
        "ggp_url": MY_IP, "core_url": MY_IP, "core_ip_list": [MY_IP, "0.0.0.0"]
    };
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(verData);
    console.log(`✅ ver.php sent`);
});

// Load Injection Routes (this is your routes.js)
require('./routes')(app);

// 🚀 TCP Forwarder (instead of echo server)
net.createServer((clientSocket) => {
    console.log(`\n🔥 [TCP] Game client connected from ${clientSocket.remoteAddress}`);

    // If real game server address not yet known, wait a bit or close
    if (!global.realGameServerAddress) {
        console.error(`❌ No real game server address known yet. Cannot forward. Closing connection.`);
        clientSocket.destroy();
        return;
    }

    const [targetIP, targetPort] = global.realGameServerAddress.split(':');
    if (!targetIP || !targetPort) {
        console.error(`❌ Invalid game server address: ${global.realGameServerAddress}`);
        clientSocket.destroy();
        return;
    }

    const serverSocket = net.createConnection(parseInt(targetPort), targetIP, () => {
        console.log(`✅ [TCP] Connected to real game server ${targetIP}:${targetPort}`);
    });

    clientSocket.on('data', (data) => {
        console.log(`📤 Client -> Server: ${data.length} bytes`);
        serverSocket.write(data);
    });

    serverSocket.on('data', (data) => {
        console.log(`📥 Server -> Client: ${data.length} bytes`);
        clientSocket.write(data);
    });

    clientSocket.on('close', () => console.log(`❌ Client disconnected`));
    serverSocket.on('close', () => console.log(`❌ Server disconnected`));
    clientSocket.on('error', (err) => console.error(`Client error: ${err.message}`));
    serverSocket.on('error', (err) => console.error(`Server error: ${err.message}`));
}).listen(TCP_PORT, '0.0.0.0', () => {
    console.log(`✅ TCP forwarder listening on port ${TCP_PORT}`);
});

// Start HTTP and HTTPS servers
http.createServer(app).listen(80);
https.createServer(sslOptions, app).listen(443);

console.log(`🚀 Core Ready. Monitoring MajorLogin via routes.js...`);
