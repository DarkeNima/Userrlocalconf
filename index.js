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

// ─────────────────────────────────────────────────────────
// 1. Load Original Binary directly from file (No Base64 issues!)
// ─────────────────────────────────────────────────────────
const LOGIN_BIN_FILE = path.join(__dirname, 'login_success.bin');

if (!fs.existsSync(LOGIN_BIN_FILE)) {
    console.error(`❌ ERROR: Cannot find ${LOGIN_BIN_FILE}! Please put the file in the same folder.`);
    process.exit(1);
}

let originalBinary = fs.readFileSync(LOGIN_BIN_FILE);
console.log(`✅ Loaded original binary from file (${originalBinary.length} bytes)`);

if (originalBinary.length !== 999) {
    console.warn(`⚠️ WARNING: Your login_success.bin is ${originalBinary.length} bytes, not 999!`);
}

// ─────────────────────────────────────────────────────────
// Helper: extract JWT and its start/end indices
// ─────────────────────────────────────────────────────────
function extractJwtWithPosition(bin) {
    // JWT එක පටන් ගන්න තැන "eyJ" (0x65 0x79 0x4a) වලින් හොයාගන්නවා
    let start = -1;
    for (let i = 0; i < bin.length - 2; i++) {
        if (bin[i] === 0x65 && bin[i+1] === 0x79 && bin[i+2] === 0x4a) {
            start = i;
            break;
        }
    }
    if (start === -1) return null;

    // JWT එකේ තියෙන්න පුළුවන් අකුරු විතරක් (A-Z, a-z, 0-9, -, _, .) තෝරගන්නවා
    let end = start;
    for (let i = start; i < bin.length; i++) {
        const c = bin[i];
        const isJwtChar = (
            (c >= 0x41 && c <= 0x5a) || // A-Z
            (c >= 0x61 && c <= 0x7a) || // a-z
            (c >= 0x30 && c <= 0x39) || // 0-9
            c === 0x2d || c === 0x5f || c === 0x2e // -, _, .
        );
        if (isJwtChar) {
            end = i;
        } else {
            break; // JWT එක ඉවර වෙන තැන (non-base64 character එකක් හමු වූ විට)
        }
    }

    const jwt = bin.slice(start, end + 1).toString('utf8');
    const parts = jwt.split('.');
    
    // JWT එකේ කොටස් 3ක් (dots 2ක්) තියෙනවද කියලා චෙක් කරනවා
    if (parts.length !== 3) {
        console.error(`⚠️ Found something, but it has ${parts.length} parts instead of 3.`);
        return null;
    }

    return { start, end, jwt };
}


// ─────────────────────────────────────────────────────────
// Patch binary: replace specific fields in the JWT payload
// ─────────────────────────────────────────────────────────
function patchLoginBinary(customPayload) {
    const info = extractJwtWithPosition(originalBinary);
    if (!info) throw new Error('JWT not found in template.');
    const { start, end, jwt } = info;
    const parts = jwt.split('.');
    const [header, oldPayloadB64, signature] = parts;
    
    let oldPayloadStr = Buffer.from(oldPayloadB64, 'base64url').toString('utf8');
    let payload;
    try {
        payload = JSON.parse(oldPayloadStr);
    } catch(e) {
        payload = {};
    }
    
    // ─────────────────────────────────────────────────────────
    // මෙතනදී අපි පරණ පේලෝඩ් එකේ තිබ්බ දත්ත වෙනස් කරන්නේ නැහැ.
    // කරන්නෙ අපේ සර්වර් එකට ඕන දේවල් විතරක් Update කරන එක.
    // ─────────────────────────────────────────────────────────
    
    // 1. Core IP එක උඹේ VPS IP එකට මාරු කරනවා
    payload.core_url = MY_IP; 
    
    // 2. Expire date එක අවුරුදු 10කට පස්සට දානවා (Session expired නොවෙන්න)
    payload.exp = Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 3600;

    // 3. උඹට අලුතින් මොනවා හරි දාන්න ඕන නම් විතරක් customPayload පාවිච්චි වෙනවා
    // නැත්නම් ඔරිජිනල් නමයි ID එකයිම තියෙයි.
    Object.assign(payload, customPayload);
    
    let newPayloadStr = JSON.stringify(payload);
    let oldPayloadLen = oldPayloadStr.length;
    let newPayloadLen = newPayloadStr.length;
    
    // Length එක සමාන කරන්න Padding කරනවා
    if (newPayloadLen < oldPayloadLen) {
        const padCount = oldPayloadLen - newPayloadLen;
        newPayloadStr = newPayloadStr.slice(0, -1) + ' '.repeat(padCount) + '}';
    } else if (newPayloadLen > oldPayloadLen) {
        // තවමත් දිග වැඩියි නම් Warning එකක් දෙනවා
        console.warn(`⚠️ Warning: Payload still too long (${newPayloadLen} > ${oldPayloadLen})`);
        newPayloadStr = newPayloadStr.slice(0, oldPayloadLen);
    }
    
    const newPayloadB64 = Buffer.from(newPayloadStr, 'utf8').toString('base64url');
    const newJwt = `${header}.${newPayloadB64}.${signature}`;
    const newJwtBuffer = Buffer.from(newJwt, 'utf8');
    
    const patched = Buffer.alloc(originalBinary.length);
    originalBinary.copy(patched, 0, 0, start);
    newJwtBuffer.copy(patched, start);
    originalBinary.copy(patched, start + newJwtBuffer.length, end + 1);
    
    return patched;
}


// ─────────────────────────────────────────────────────────
// SSL certificates (Let's Encrypt)
// ─────────────────────────────────────────────────────────
let sslOptions;
try {
    sslOptions = {
        key: fs.readFileSync(`/etc/letsencrypt/live/${MY_DOMAIN}/privkey.pem`),
        cert: fs.readFileSync(`/etc/letsencrypt/live/${MY_DOMAIN}/fullchain.pem`)
    };
    console.log('✅ SSL loaded');
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
// /MajorLogin – serve length‑preserved patched binary
// ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────
// /MajorLogin – serve length‑preserved patched binary
// ─────────────────────────────────────────────────────────
app.post('/MajorLogin', (req, res) => {
    console.log(`\n🎯 [MajorLogin] from ${req.ip}`);
    
    // මෙතන හිස්ව තිබ්බොත් ඔරිජිනල් නමයි ID එකයි ඔටෝම වැටෙනවා
    const customPayload = {}; 
    
    try {
        const patchedBinary = patchLoginBinary(customPayload);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.status(200).send(patchedBinary);
        console.log(`✅ Sent patched binary (Original ID/Name preserved)`);
    } catch (err) {
        console.error(`❌ Patching error:`, err.message);
        res.status(500).send('Internal server error');
    }
});

// ඊළඟට Ping එක එහෙමම තියෙන්න දෙන්න



app.post('/Ping', (req, res) => { res.status(200).send("OK"); });

app.all('/*splat', (req, res) => {
    if (['/ver.php', '/MajorLogin', '/Ping'].includes(req.path)) return;
    res.status(200).send("OK");
});

const tcpServer = net.createServer((socket) => {});
tcpServer.listen(TCP_PORT, '0.0.0.0', () => console.log(`🚀 TCP Core on ${TCP_PORT}`));

http.createServer(app).listen(HTTP_PORT, '0.0.0.0', () => console.log(`🌐 HTTP on ${HTTP_PORT}`));
https.createServer(sslOptions, app).listen(HTTPS_PORT, '0.0.0.0', () => console.log(`🔒 HTTPS on ${HTTPS_PORT}`));

console.log(`\n🚀 LENGTH‑PRESERVING PATCHER ACTIVE`);
console.log(`🔗 ${MY_URL_HTTPS}`);
console.log(`📦 /MajorLogin reads from file and returns exact length`);
