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

// ඔයාගේ අලුත් VPS IP එක සහ Domain එක
const MY_DOMAIN = 'navivpn.sytes.net';
const MY_IP = '103.6.168.170';
const MY_URL_HTTPS = `https://${MY_DOMAIN}`;

// 🛑 1. Official Server එකෙන් ආපු දත්ත වලට සමාන Protobuf Schema එක
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
                field16: { type: "string", id: 16 }, // Game Server IPs
                field19: { type: "string", id: 19 },
                field21: { type: "uint32", id: 21 }, // Timestamp
                field22: { type: "bytes", id: 22 },  // Key
                field23: { type: "bytes", id: 23 },  // IV
                field24: { type: "string", id: 24 }, // Game Server IPs
                field25: { type: "Field25Msg", id: 25 }
            }
        },
        Field15Msg: {
            fields: {
                sub1: { type: "uint32", id: 1 }
            }
        },
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

// 🔒 2. SSL Certificates ලෝඩ් කිරීම
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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.disable('etag');

// 🌐 3. ver.php - ගේම් එක VPS එකට හරවා ගැනීම
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

// 🎯 4. MajorLogin - අපේ Custom Protobuf Payload එක යැවීම
app.post('/MajorLogin', (req, res) => {
    console.log(`\n🎯 [MajorLogin] Request from ${req.ip}`);
    
    try {
        // ඉතා වැදගත්: uint64 අගයන් String ලෙස තැබිය යුතුය (protobufjs handle කරයි)
        const payload = {
            field1: "9630144540", 
            field2: "SG",
            field3: "SG",
            field4: "SG",
            field5: "live",
            field8: "eyJhbGciOiJIUzI1NiIsInN2ciI6IjEiLCJ0eXAiOiJKV1QifQ.eyJhY2NvdW50X2lkIjo5NjMwMTQ0NTQwLCJuaWNrbmFtZSI6Illpa2Jkbmh1T2lJPSIsIm5vdGlfcmVnaW9uIjoiU0ciLCJsb2NrX3JlZ2lvbiI6IlNHIiwiZXh0ZXJuYWxfaWQiOiJhODEyMTVjNDVhNjlmNjVjYTcwZWQ1ZDgzOTFiODZhNyIsImV4dGVybmFsX3R5cGUiOjgsInBsYXRfaWQiOjEsImNsaWVudF92ZXJzaW9uIjoiMS4xMjMuOCIsImVtdWxhdG9yX3Njb3JlIjowLCJpc19lbXVsYXRvciI6ZmFsc2UsImNvdW50cnlfY29kZSI6IlNHIiwiZXh0ZXJuYWxfdWlkIjoxNTkxMDAxMTMzNzU2LCJyZWdfYXZhdGFyIjoxMDIwMDAwMDUsInNvdXJjZSI6MCwibG9ja19yZWdpb25fdGltZSI6MTcyMDUzNDI4NywiY2xpZW50X3R5cGUiOjIsInNpZ25hdHVyZV9tZDUiOiI3NDI4YjI1M2RlZmMxNjQwMThjNjA0YTFlYmJmZWJkZiIsInVzaW5nX3ZlcnNpb24iOjEsInJlbGVhc2VfY2hhbm5lbCI6ImFuZHJvaWQiLCJyZWxlYXNlX3ZlcnNpb24iOiJPQjUzIiwiZXhwIjoyMDk0NDYwODAwfQ.oCz8WZWSIOwPODOlGE7qwgw55dT4rqsNV5p33ZaACuI",
            field9: 28800,
            field10: "https://clientbp.ggpolarbear.com", 
            field15: { sub1: 1 },
            field16: `${MY_IP}:${TCP_PORT}`, 
            field19: "Singapore",
            field21: 1778320181,
            // ⚠️ අවධානය: hex string එකේ හිස්තැන් තිබිය නොහැක
            field22: Buffer.from("cdf7dd8bef5bf9774054040840304234", "hex"),
            field23: Buffer.from("fccfae85ff6dfa776110044050304036", "hex"),
            field24: `${MY_IP}:${TCP_PORT}`, 
            field25: {
                sub1: "SG",
                sub2: 1,
                sub5: 1,
                sub6: 1,
                sub7: 1
            }
        };

        const message = LoginResponseMsg.create(payload);
        const buffer = LoginResponseMsg.encode(message).finish();

        // 🛑 Header එක අනිවාර්යයි
        res.setHeader('Content-Type', 'application/octet-stream');
        res.status(200).send(buffer);
        console.log(`✅ Binary Sent! Length: ${buffer.length} bytes`);

    } catch (err) {
        console.error(`❌ Serialization Error:`, err);
        res.status(500).send('Error');
    }
});

app.post('/Ping', (req, res) => { res.status(200).send("OK"); });

// වෙනත් ඕනෑම Request එකක් ආවොත් OK කියලා යවනවා
app.all('/*splat', (req, res) => {
    if (['/ver.php', '/MajorLogin', '/Ping'].includes(req.path)) return;
    res.status(200).send("OK");
});

// ⚡ TCP සර්වර් එක - ගේම් එක Login වුණාට පස්සේ Connect වෙන්නේ මෙතනටයි
const tcpServer = net.createServer((socket) => {
    console.log(`\n🎮 [TCP] Game Client Connected from ${socket.remoteAddress}`);
    
    socket.on('data', (data) => {
        console.log(`[TCP] Received ${data.length} bytes from Client`);
        // මෙතනින් ඉස්සරහට Game Play Packets Handle කරන්න ඕනේ
    });

    socket.on('error', (err) => console.log(`[TCP Error] ${err.message}`));
    socket.on('close', () => console.log(`[TCP] Client Disconnected`));
});

tcpServer.listen(TCP_PORT, '0.0.0.0', () => console.log(`🚀 Game TCP Server running on Port ${TCP_PORT}`));

http.createServer(app).listen(HTTP_PORT, '0.0.0.0', () => console.log(`🌐 HTTP running on ${HTTP_PORT}`));
https.createServer(sslOptions, app).listen(HTTPS_PORT, '0.0.0.0', () => console.log(`🔒 HTTPS running on ${HTTPS_PORT}`));

console.log(`\n🚀 FREE FIRE PRIVATE SERVER ACTIVE`);
console.log(`🔗 Domain: ${MY_URL_HTTPS}`);
console.log(`📦 MajorLogin Protocol: Protobuf Dynamic Generation`);
