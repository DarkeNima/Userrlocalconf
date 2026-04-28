const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const net = require('net');

const app = express();
const HTTP_PORT = 80;
const HTTPS_PORT = 443;
const TCP_PORT = 7006;
const MY_DOMAIN = 'navidu-ff.duckdns.org';
const MY_IP = '139.162.54.41';
const MY_URL_HTTPS = `https://${MY_DOMAIN}`;

// ─────────────────────────────────────────────────────────
// Embedded binary template (Base64 of login_success.bin)
// ─────────────────────────────────────────────────────────
const BASE64_TEMPLATE = `1ZkuNBIAAABTRwAAAFNHIgBTRyogbGl2ZUKWIGV5SmhiR2NpT2lKSVV6STFOaUlzSW5OMmNpSTZJakVpTENKMGVYQWlPaUpLVjFRaWZRtmV5SmhZMk52ZFc1MFgzbGtrR294TXprNE9UZ3lNekEyTlN3aWJtbGphMjVhbVdzaU9pSm1ORlZDVmU1T2VYYzJja0k0ZHV2SDBPOVJYQUFHSGpla0lpd2libTkwYV9jbVdubHZiaU9pVTBjaUxTMWtiMk5yWTI5dVpXNWxYbkpsWjJsdmJpT2lVMENpTENKbWVYUmxjbTVoYmZocFpDSTZJbUU0TVRaaE56WmxZak00Tnpoak9ESmpOelZtT1RFeE1ERXhZVEUyT0dSbElpd2laWGwwWlhKdVlXeGZkSGx3WlNJNk1URXNJaHBzWVhSMFlXUmZpRE9qTVN3aW1HeGxiVzUwWDIxbGNuTnBiMjVpSWpvaU1TNHhNak11T0N0emRXNWxkbkpsYm5WemRHbHZiaU9pTVN3aW1XMTFiR3gwYjNKMmNteHZiV1VpT2pBd0xDSnBjeFpsYlhWc1lYUnZjbWxmYzJOdmNtVWlPaUptWVd4elpYUnzcpXp6yYmNjU3mYWRjYnpGSmYyZ3ZkbWxqYTI5dWJtVnNJaW9pTVN3aWljbVpzWldGelpWOWphR0Z1Ym1Wc0lqb2lZVzVreW05cFpDSXNJaUpyWld4bFlYTmxYMlpsY25OcGJjSXRhbTlrWlZOM0lpd2laWGh3SWpveE56YzNNamt6T1RBNGZRLm9Qa185X2pJQ2lydDZsS2ZFcVhReDBITENhVGRqMTNGSDBwMlhKQlo5ZGtI4uEgUiBodHRwczovL2F1dGhzcnYxLmFuZHJvaWRzcnZzLmNvbXogIBKCCV1jc292ZXJzZWEuc3Ryb25naG9sZC5mcmVlZmlyZW1vYmlsZS5jb207MzQuMTI2Ljc2LjQ1OzM0Ljg3LjE3Ny4xNDszNC44Ny4xNzAuMjMwOzM1LjE4NS4xODMuNTfopyDCz88fsqAgALEv6Z76vvdnICAgJDggIFIgurAgIKAgmpog7u13eiAwJFAnIEAAQA==`;

const binaryTemplate = Buffer.from(BASE64_TEMPLATE, 'base64');
console.log(`✅ Loaded binary template (${binaryTemplate.length} bytes)`);

// ─────────────────────────────────────────────────────────
// Extract JWT from binary and return { jwt, start, end }
// ─────────────────────────────────────────────────────────
function extractJwtWithPosition(bin) {
    for (let i = 0; i < bin.length - 2; i++) {
        if (bin[i] === 0x65 && bin[i+1] === 0x79 && bin[i+2] === 0x4a) {
            let start = i;
            let dotCount = 0;
            let end = start;
            for (let j = start; j < bin.length && dotCount < 3; j++) {
                if (bin[j] === 0x2e) dotCount++;
                end = j;
            }
            if (dotCount === 3) {
                const jwtBuffer = bin.slice(start, end + 1);
                return {
                    jwt: jwtBuffer.toString('utf8'),
                    start: start,
                    end: end
                };
            }
        }
    }
    return null;
}

// Replace JWT using known positions
function replaceJwtByPosition(bin, newJwt, start, end) {
    const newJwtBuffer = Buffer.from(newJwt, 'utf8');
    const newBin = Buffer.alloc(bin.length - (end - start + 1) + newJwtBuffer.length);
    bin.copy(newBin, 0, 0, start);
    newJwtBuffer.copy(newBin, start);
    bin.copy(newBin, start + newJwtBuffer.length, end + 1);
    return newBin;
}

// Build login response from custom payload
function buildLoginResponse(customPayload) {
    const jwtInfo = extractJwtWithPosition(binaryTemplate);
    if (!jwtInfo) throw new Error('Template missing JWT');
    const { jwt: oldJwt, start, end } = jwtInfo;
    const [headerB64, oldPayloadB64, signatureB64] = oldJwt.split('.');
    
    let oldPayload = {};
    try {
        const oldPayloadJson = Buffer.from(oldPayloadB64, 'base64url').toString('utf8');
        oldPayload = JSON.parse(oldPayloadJson);
    } catch (e) {
        // ignore – use empty payload
    }
    
    const newPayload = { ...oldPayload, ...customPayload };
    newPayload.core_url = MY_IP;
    newPayload.exp = Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 3600;
    
    const newPayloadB64 = Buffer.from(JSON.stringify(newPayload)).toString('base64url');
    const newJwt = `${headerB64}.${newPayloadB64}.${signatureB64}`;
    
    return replaceJwtByPosition(binaryTemplate, newJwt, start, end);
}

// ─────────────────────────────────────────────────────────
// SSL Certificates
// ─────────────────────────────────────────────────────────
let sslOptions;
try {
    sslOptions = {
        key: fs.readFileSync(`/etc/letsencrypt/live/${MY_DOMAIN}/privkey.pem`),
        cert: fs.readFileSync(`/etc/letsencrypt/live/${MY_DOMAIN}/fullchain.pem`)
    };
    console.log('✅ SSL certificates loaded');
} catch (err) {
    console.error('❌ SSL error:', err.message);
    process.exit(1);
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.disable('etag');

// ─────────────────────────────────────────────────────────
// /ver.php
// ─────────────────────────────────────────────────────────
app.get('/ver.php', (req, res) => {
    console.log(`\n[VER.PHP] from ${req.ip}`);
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
        "billboard_cdn_url": "https://dl-tata.freefireind.in/common/OB53/CSH/patchupdate/indhfuHFHf101.ff_extend;https://dl-tata.freefireind.in/common/OB53/CSH/patchupdate/indhfuHFHf102.ff_extend;https://dl-tata.freefireind.in/common/OB53/CSH/patchupdate/indhfuHFHf103.ff_extend;https://dl-tata.freefireind.in/common/OB53/CSH/patchupdate/indhfuHFHf104.ff_extend;https://dl-tata.freefireind.in/common/OB53/CSH/patchupdate/indhfuHFHf105.ff_extend",
        "ggp_url": MY_IP,
        "core_url": MY_IP,
        "core_ip_list": [MY_IP, "0.0.0.0"]
    };
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(verData);
    console.log(`✅ ver.php sent`);
});

// ─────────────────────────────────────────────────────────
// /MajorLogin
// ─────────────────────────────────────────────────────────
app.post('/MajorLogin', (req, res) => {
    console.log(`\n🎯 [MajorLogin] from ${req.ip}`);
    
    // ✨ EDIT YOUR CUSTOM PLAYER DATA HERE ✨
    const customPayload = {
        account_id: 123456789,           // change to any number
        nickname: "MyServer",            // custom nickname
        session_key: "emu_" + Date.now(),
    };
    
    try {
        const loginBinary = buildLoginResponse(customPayload);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.status(200).send(loginBinary);
        console.log(`✅ Sent dynamic binary (${loginBinary.length} bytes) for account ${customPayload.account_id}`);
    } catch (err) {
        console.error(`❌ Failed to build login response:`, err.message);
        res.status(500).send('Internal server error');
    }
});

// ─────────────────────────────────────────────────────────
// /Ping
// ─────────────────────────────────────────────────────────
app.post('/Ping', (req, res) => {
    console.log(`📡 [Ping]`);
    res.status(200).send("OK");
});

// Catch-all
app.all('/*splat', (req, res) => {
    if (['/ver.php', '/MajorLogin', '/Ping'].includes(req.path)) return;
    console.log(`🔎 [OTHER] ${req.method} ${req.path}`);
    res.status(200).send("OK");
});

// ─────────────────────────────────────────────────────────
// TCP Core
// ─────────────────────────────────────────────────────────
const tcpServer = net.createServer((socket) => {
    const addr = socket.remoteAddress;
    console.log(`\n📡 [TCP CONNECT] ${addr}`);
    socket.on('data', (data) => {
        console.log(`📩 [TCP DATA] ${data.length} bytes from ${addr}`);
    });
    socket.on('error', (err) => console.log(`❌ TCP error: ${err.message}`));
    socket.on('close', () => console.log(`🔌 TCP closed: ${addr}`));
});
tcpServer.listen(TCP_PORT, '0.0.0.0', () => {
    console.log(`🚀 TCP Core listening on port ${TCP_PORT}`);
});

// Start servers
http.createServer(app).listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`🌐 HTTP server on port ${HTTP_PORT}`);
});
https.createServer(sslOptions, app).listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`🔒 HTTPS server on port ${HTTPS_PORT}`);
});

console.log(`\n🚀 100% INDEPENDENT FREE FIRE EMULATOR`);
console.log(`🔗 Base URL: ${MY_URL_HTTPS}`);
console.log(`🎮 /MajorLogin generates custom binary using index‑based JWT replacement`);
