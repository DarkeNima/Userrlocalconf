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

// ඔයාගේ අලුත් IP එක සහ Domain එක
const MY_DOMAIN = 'navivpn.sytes.net';
const MY_IP = '103.6.168.170';
const MY_URL_HTTPS = `https://${MY_DOMAIN}`;

const TARGET_HOST = 'loginbp.ggpolarbear.com';
const LOG_DIR = path.join(__dirname, 'logs');

// logs ෆෝල්ඩරය නැත්නම් අලුතින් හදමු
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

// ⚠️ SSL සහතික සෙට් කිරීම 
// (අලුත් navivpn.sytes.net එකට Let's Encrypt අරන් තියෙන්න ඕනේ)
let sslOptions;
try {
    sslOptions = {
        key: fs.readFileSync(`/etc/letsencrypt/live/${MY_DOMAIN}/privkey.pem`),
        cert: fs.readFileSync(`/etc/letsencrypt/live/${MY_DOMAIN}/fullchain.pem`)
    };
    console.log('✅ SSL loaded successfully');
} catch (err) {
    console.error('❌ SSL error (Let\'s Encrypt සහතික නැතිනම් Server එක Run වෙන්නේ නෑ):', err.message);
    process.exit(1);
}

// Binary Data (Protobuf) හරියටම capture කරන්න ඕන නිසා මේක පාවිච්චි කරනවා
app.use((req, res, next) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
        req.rawBody = Buffer.concat(chunks);
        next();
    });
});

// 1. ගේම් එකට අපේ සර්වර් එකේ විස්තර දෙන තැන (ver.php)
app.get('/ver.php', (req, res) => {
    console.log(`\n[VER.PHP] Requested by ${req.ip}`);
    const clientIp = req.ip.replace('::ffff:', '');
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
        "server_url": `${MY_URL_HTTPS}/`, // ගේම් එකට අපේ VPS එකට එන්න කියනවා
        "is_review_server": false,
        "use_login_optional_download": true,
        "use_background_download": false,
        "use_background_download_lobby": false,
        "country_code": "SG",
        "client_ip": clientIp,
        "gdpr_version": 0,
        "billboard_cdn_url": "https://dl-tata.freefireind.in/common/OB53/CSH/patchupdate/indhfuHFHf101.ff_extend;https://dl-tata.freefireind.in/common/OB53/CSH/patchupdate/indhfuHFHf102.ff_extend",
        "ggp_url": MY_IP,
        "core_url": MY_IP,
        "core_ip_list": [MY_IP, "0.0.0.0"]
    };
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(verData);
    console.log(`✅ ver.php sent`);
});

// 2. MajorLogin යවන එක Official Server එකට Forward කරලා Data Capture කිරීම
app.post('/MajorLogin', (req, res) => {
    const timestamp = Date.now();
    console.log(`\n🎯 [MajorLogin] Intercepted from ${req.ip}`);

    // ගේම් එකෙන් ආපු Binary Data එක Save කිරීම (Request)
    const reqLogPath = path.join(LOG_DIR, `req_MajorLogin_${timestamp}.bin`);
    fs.writeFileSync(reqLogPath, req.rawBody);
    console.log(`[→] Game Request Data Saved: ${req.rawBody.length} bytes`);

    // Official Server එකට යවන්න Headers හදමු (Host එක වෙනස් කරනවා)
    const forwardHeaders = { ...req.headers, host: TARGET_HOST };

    const options = {
        hostname: TARGET_HOST,
        port: 443,
        path: req.originalUrl,
        method: req.method,
        headers: {
            ...forwardHeaders,
            'content-length': req.rawBody.length,
        },
    };

    // Official Server එකට Request එක යැවීම
    const proxyReq = https.request(options, (proxyRes) => {
        const resChunks = [];

        proxyRes.on('data', chunk => resChunks.push(chunk));
        proxyRes.on('end', () => {
            const responseBody = Buffer.concat(resChunks);

            // Official Server එකෙන් ආපු Binary Data එක Save කිරීම (Response)
            const resLogPath = path.join(LOG_DIR, `res_MajorLogin_${timestamp}.bin`);
            fs.writeFileSync(resLogPath, responseBody);
            console.log(`[←] Official Response Saved: Status ${proxyRes.statusCode} | ${responseBody.length} bytes`);

            // ඒ ආපු විදිහටම ගේම් එකට ආපහු යැවීම
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            res.end(responseBody);
        });
    });

    proxyReq.on('error', (err) => {
        console.error('❌ [PROXY ERROR]', err.message);
        res.status(502).send('Bad Gateway');
    });

    proxyReq.write(req.rawBody);
    proxyReq.end();
});

app.post('/Ping', (req, res) => { res.status(200).send("OK"); });

app.all('/*splat', (req, res) => {
    if (['/ver.php', '/MajorLogin', '/Ping'].includes(req.path)) return;
    res.status(200).send("OK");
});

// TCP Server (දැනට නිකම්ම On කරලා තියෙන්නේ)
const tcpServer = net.createServer((socket) => {});
tcpServer.listen(TCP_PORT, '0.0.0.0', () => console.log(`🚀 TCP Core on ${TCP_PORT}`));

// Web Servers
http.createServer(app).listen(HTTP_PORT, '0.0.0.0', () => console.log(`🌐 HTTP on ${HTTP_PORT}`));
https.createServer(sslOptions, app).listen(HTTPS_PORT, '0.0.0.0', () => console.log(`🔒 HTTPS on ${HTTPS_PORT}`));

console.log(`\n🚀 REVERSE PROXY & LOGGER ACTIVE`);
console.log(`🔗 Domain: ${MY_URL_HTTPS}`);
console.log(`🎯 Forwarding /MajorLogin to ${TARGET_HOST}`);
console.log(`📁 Logs will be saved in: ${LOG_DIR}`);
