const express = require('express');
const axios = require('axios');
const http = require('http');
const https = require('https');
const fs = require('fs');
const net = require('net');
const protobuf = require('protobufjs');

const app = express();
const HTTP_PORT = 80;
const HTTPS_PORT = 443;
const TCP_PORT = 7006;

// VPS විස්තර
const MY_DOMAIN = 'navivpn.sytes.net';
const MY_IP = '103.6.168.170';
const MY_URL_HTTPS = `https://${MY_DOMAIN}`;

// 🛑 1. Protobuf Schema එක (Garena Structure එකටම)
const root = protobuf.Root.fromJSON({
    nested: {
        MajorLoginResponse: {
            fields: {
                field1: { type: "uint64", id: 1 },
                field2: { type: "string", id: 2 },
                field3: { type: "string", id: 3 },
                field4: { type: "string", id: 4 },
                field5: { type: "string", id: 5 },
                field8: { type: "string", id: 8 },   // JWT Token
                field9: { type: "uint32", id: 9 },
                field10: { type: "string", id: 10 },
                field15: { type: "Field15Msg", id: 15 },
                field16: { type: "string", id: 16 }, // Server IP
                field19: { type: "string", id: 19 },
                field21: { type: "uint32", id: 21 },
                field22: { type: "bytes", id: 22 },  // Crypto Key
                field23: { type: "bytes", id: 23 },  // Crypto IV
                field24: { type: "string", id: 24 }, // Server IP
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

// 🔒 2. SSL Certificates
let sslOptions;
try {
    sslOptions = {
        key: fs.readFileSync(`/etc/letsencrypt/live/${MY_DOMAIN}/privkey.pem`),
        cert: fs.readFileSync(`/etc/letsencrypt/live/${MY_DOMAIN}/fullchain.pem`)
    };
    console.log('✅ SSL loaded successfully');
} catch (err) {
    console.error('❌ SSL error:', err.message);
    process.exit(1);
}

// Binary Data handle කරන්න අවශ්‍ය Middleware
app.use(express.raw({ type: 'application/octet-stream', limit: '2mb' }));
app.use(express.json());

// 🌐 3. ver.php
//🌐 3. ver.php - ගේම් එක VPS එකට හරවා ගැනීම
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
// 🎯 4. MajorLogin (Live Relay & Patching)
app.post('/MajorLogin', async (req, res) => {
    console.log(`\n🔄 [MajorLogin] Relaying request to Official Server...`);
    
    try {
        // A. ගේම් එකෙන් ආපු Binary data එක එහෙමම Official Server එකට යවනවා
        const officialResponse = await axios.post('https://loginbp.ggpolarbear.com/MajorLogin', req.body, {
            headers: { 'Content-Type': 'application/octet-stream' },
            responseType: 'arraybuffer',
            timeout: 10000
        });

        // B. Official Response එක Decode කරලා බලනවා
        const decoded = LoginResponseMsg.decode(Buffer.from(officialResponse.data));
        console.log(`✅ Live Token Received for: ${decoded.field1}`);

        // C. දැන් වැදගත්ම කොටස - දත්ත "Patch" කිරීම
        // Token එක සහ Keys (Field 8, 22, 23) එහෙමම තියෙද්දී IP විතරක් අපේ එකට හරවනවා
        decoded.field16 = `${MY_IP}:${TCP_PORT}`;
        decoded.field24 = `${MY_IP}:${TCP_PORT}`;
        decoded.field10 = MY_URL_HTTPS; // ClientBP එකත් අපේ එකට

        // D. Patch කරපු දත්ත නැවත Binary (Protobuf) කරලා ගේම් එකට යවනවා
        const patchedBuffer = LoginResponseMsg.encode(decoded).finish();

        res.setHeader('Content-Type', 'application/octet-stream');
        res.status(200).send(patchedBuffer);
        console.log(`🚀 Patched Live Response Sent! (${patchedBuffer.length} bytes)`);

    } catch (err) {
        console.error(`❌ Relay Error:`, err.message);
        // මොකක් හරි අවුලක් වුණොත් "Network Error" නොවී ඉන්න සාමාන්‍ය OK එකක් යවනවා
        res.status(500).send("Proxy Error");
    }
});

app.post('/Ping', (req, res) => res.status(200).send("OK"));
app.all('/*splat', (req, res) => res.status(200).send("OK"));

// ⚡ 5. TCP Server (Lobby/Match Server)
const tcpServer = net.createServer((socket) => {
    console.log(`\n🎮 [TCP] Game Client Connected: ${socket.remoteAddress}`);
    
    socket.on('data', (data) => {
        console.log(`[TCP] Data Received: ${data.length} bytes`);
    });

    socket.on('error', (err) => console.log(`[TCP Error] ${err.message}`));
});

tcpServer.listen(TCP_PORT, '0.0.0.0', () => console.log(`🚀 TCP Server on Port ${TCP_PORT}`));
http.createServer(app).listen(HTTP_PORT, '0.0.0.0', () => console.log(`🌐 HTTP on ${HTTP_PORT}`));
https.createServer(sslOptions, app).listen(HTTPS_PORT, '0.0.0.0', () => console.log(`🔒 HTTPS on ${HTTPS_PORT}`));

console.log(`\n🔥 LIVE RELAY SERVER ACTIVE`);
