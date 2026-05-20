const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const net = require('net');
const protobuf = require('protobufjs');

const app = express();
const HTTP_PORT = 80;
const HTTPS_PORT = 443;
const TCP_PORT = 7006;

// ⚙️ Configuration
const MY_DOMAIN = 'navivpn.sytes.net';
const MY_IP = '103.6.168.170';
const MY_URL_HTTPS = `https://${MY_DOMAIN}`;
const TARGET_HOST = 'loginbp.ggpolarbear.com'; 
const TARGET_BATTLE_HOST = 'csoversea.stronghold.freefiremobile.com';

// Protobuf Schema
const root = protobuf.Root.fromJSON({
    nested: {
        MajorLoginResponse: {
            fields: {
                field1: { type: "uint64", id: 1 },
                field2: { type: "string", id: 2 },
                field3: { type: "string", id: 3 },
                field4: { type: "string", id: 4 },
                field5: { type: "string", id: 5 },
                field8: { type: "string", id: 8 },
                field9: { type: "uint32", id: 9 },
                field10: { type: "string", id: 10 },
                field15: { type: "Field15Msg", id: 15 },
                field16: { type: "string", id: 16 },
                field19: { type: "string", id: 19 },
                field21: { type: "uint32", id: 21 },
                field22: { type: "bytes", id: 22 },
                field23: { type: "bytes", id: 23 },
                field24: { type: "string", id: 24 },
                field25: { type: "Field25Msg", id: 25 }
            }
        },
        Field15Msg: { fields: { sub1: { type: "uint32", id: 1 } } },
        Field25Msg: {
            fields: {
                sub1: { type: "string", id: 1 },
                sub2: { type: "uint32", id: 2 },
                sub5: { type: "uint32", id: 5 },
                sub6: { type: "uint32", id: 6 },
                sub7: { type: "uint32", id: 7 }
            }
        }
    }
});

const LoginResponseMsg = root.lookupType("MajorLoginResponse");

// SSL Certificates
let sslOptions;
try {
    sslOptions = {
        key: fs.readFileSync(`/etc/letsencrypt/live/${MY_DOMAIN}/privkey.pem`),
        cert: fs.readFileSync(`/etc/letsencrypt/live/${MY_DOMAIN}/fullchain.pem`)
    };
    console.log('✅ SSL Certificates loaded');
} catch (err) {
    console.error('❌ SSL Error:', err.message);
    process.exit(1);
}

// Raw Body Capture
app.use((req, res, next) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => { req.rawBody = Buffer.concat(chunks); next(); });
});

// 1️⃣ ver.php

    
// 1️⃣ [ver.php]
app.get('/ver.php', (req, res) => {
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
        "server_url": `${MY_URL_HTTPS}/`, 
        "is_review_server": false,
        "use_login_optional_download": true,
        "use_background_download": false,
        "use_background_download_lobby": false,
        "country_code": "SG",
        "client_ip": clientIp,
        "gdpr_version": 0,
        "billboard_cdn_url": "https://dl-tata.freefireind.in/common/OB53/CSH/patchupdate/indhfuHFHf101.ff_extend",
        "ggp_url": MY_IP,
        "core_url": MY_IP,
        "core_ip_list": [MY_IP, "0.0.0.0"]
    };
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(verData);
    console.log(`✅ ver.php sent`);
});
// 2️⃣ MajorLogin
app.post('/MajorLogin', (req, res) => {
    console.log(`\n🎯 [MajorLogin] Captured!`);

    const options = {
        hostname: TARGET_HOST,
        port: 443,
        path: '/MajorLogin',
        method: 'POST',
        headers: { ...req.headers, 'host': TARGET_HOST }
    };

    const proxyReq = https.request(options, (proxyRes) => {
        const resChunks = [];
        proxyRes.on('data', chunk => resChunks.push(chunk));
        proxyRes.on('end', () => {
            const originalBuffer = Buffer.concat(resChunks);
            try {
                const decoded = LoginResponseMsg.decode(originalBuffer);

                const NEW_SERVER_LIST = `\( {MY_IP}: \){TCP_PORT}`;
                decoded.field16 = NEW_SERVER_LIST;
                decoded.field24 = NEW_SERVER_LIST;
                decoded.field10 = MY_URL_HTTPS;

                if (decoded.field22) {
                    let s = decoded.field22.toString();
                    s = s.replace(/csoversea\.stronghold\.freefiremobile\.com/g, MY_IP);
                    s = s.replace(/\b34\.\d+\.\d+\.\d+\b/g, MY_IP);
                    decoded.field22 = Buffer.from(s);
                }
                if (decoded.field23) {
                    let s2 = decoded.field23.toString();
                    s2 = s2.replace(/csoversea\.stronghold\.freefiremobile\.com/g, MY_IP);
                    s2 = s2.replace(/\b34\.\d+\.\d+\.\d+\b/g, MY_IP);
                    decoded.field23 = Buffer.from(s2);
                }

                res.send(LoginResponseMsg.encode(LoginResponseMsg.create(decoded)).finish());
                console.log("✅ MajorLogin Injection Successful");
            } catch (err) {
                console.error("❌ Decode failed:", err.message);
                res.send(originalBuffer);
            }
        });
    });
    proxyReq.write(req.rawBody);
    proxyReq.end();
});

// ====================== FULL UNLOCK ROUTES ======================

// ====================== BETTER FULL UNLOCK (Original Style) ======================
app.post('/GetPlayerInfo', (req, res) => {
    console.log("🔓 [GetPlayerInfo] → Original Style Full Unlock");
    
    const playerInfo = {
        "code": 0,
        "msg": "success",
        "player": {
            "uid": "6969696969",
            "nickname": "NaviPrivate",
            "level": 99,
            "exp": 999999999,
            "vip_level": 12,
            "gold": 999999999,
            "diamond": 999999999,
            "honor": 999999,
            "create_time": Math.floor(Date.now()/1000),
            "last_login_time": Math.floor(Date.now()/1000)
        },
        "inventory": {
            "all_unlocked": true,
            "characters": [],
            "skins": [],
            "weapons": [],
            "emotes": [],
            "pets": []
        },
        "status": "ok",
        "result": 0
    };
    
    res.json(playerInfo);
});

app.post('/GetUserInfo', (req, res) => {
    console.log("🔓 [GetUserInfo] → Success");
    res.json({
        "code": 0,
        "player": {
            "nickname": "NaviPrivate",
            "level": 99
        }
    });
});
app.post('/GetInventory', (req, res) => {
    console.log("🔓 [GetInventory] → All items unlocked");
    res.json({ "code": 0, "all_unlocked": true });
});

app.post('/GetUserInfo', (req, res) => {
    console.log("🔓 [GetUserInfo] → Success");
    res.json({ "code": 0 });
});

app.post('/GetLoginData', (req, res) => {
    console.log("🔓 [GetLoginData] → Success");
    res.json({ "code": 0 });
});

// Other common endpoints
app.post('/Ping', (req, res) => { res.send("OK"); });
app.post('/GetConfig', (req, res) => { res.json({ "code": 0 }); });

// Catch-all Forwarding
app.use((req, res, next) => {
    if (req.method === 'POST' && !['/MajorLogin', '/GetPlayerInfo', '/GetInventory', '/GetUserInfo', '/GetLoginData'].includes(req.path)) {
        console.log(`➡️ Forwarding ${req.path}`);
        
        const options = {
            hostname: TARGET_HOST,
            port: 443,
            path: req.originalUrl,
            method: 'POST',
            headers: { ...req.headers, host: TARGET_HOST }
        };

        const proxyReq = https.request(options, (proxyRes) => {
            let chunks = [];
            proxyRes.on('data', c => chunks.push(c));
            proxyRes.on('end', () => res.send(Buffer.concat(chunks)));
        });

        proxyReq.on('error', () => res.status(200).send('{}'));
        if (req.rawBody) proxyReq.write(req.rawBody);
        proxyReq.end();
    }
});

// TCP Server
const tcpServer = net.createServer((socket) => {
    console.log(`🔥 [TCP] Client Connected: ${socket.remoteAddress}`);
    const target = net.createConnection({ host: TARGET_BATTLE_HOST, port: 7006 });
    socket.pipe(target);
    target.pipe(socket);
});

tcpServer.listen(TCP_PORT, '0.0.0.0', () => console.log(`🚀 TCP Proxy on ${TCP_PORT}`));

// Start Servers
http.createServer(app).listen(HTTP_PORT, () => console.log(`🌐 HTTP on ${HTTP_PORT}`));
https.createServer(sslOptions, app).listen(HTTPS_PORT, () => {
    console.log(`🔒 HTTPS on ${HTTPS_PORT}`);
    console.log(`\n==================================`);
    console.log(`   PRIVATE SERVER IS RUNNING`);
    console.log(`==================================\n`);
});
