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
// 1. Embedded binary template (Base64 of your login_success.bin)
// ─────────────────────────────────────────────────────────
const BASE64_TEMPLATE = `1ZkuNBIAAABTRwAAAFNHIgBTRyogbGl2ZUKWIGV5SmhiR2NpT2lKSVV6STFOaUlzSW5OMmNpSTZJakVpTENKMGVYQWlPaUpLVjFRaWZRtmV5SmhZMk52ZFc1MFgzbGtrR294TXprNE9UZ3lNekEyTlN3aWJtbGphMjVhbVdzaU9pSm1ORlZDVmU1T2VYYzJja0k0ZHV2SDBPOVJYQUFHSGpla0lpd2libTkwYV9jbVdubHZiaU9pVTBjaUxTMWtiMk5yWTI5dVpXNWxYbkpsWjJsdmJpT2lVMENpTENKbWVYUmxjbTVoYmZocFpDSTZJbUU0TVRaaE56WmxZak00Tnpoak9ESmpOelZtT1RFeE1ERXhZVEUyT0dSbElpd2laWGwwWlhKdVlXeGZkSGx3WlNJNk1URXNJaHBzWVhSMFlXUmZpRE9qTVN3aW1HeGxiVzUwWDIxbGNuTnBiMjVpSWpvaU1TNHhNak11T0N0emRXNWxkbkpsYm5WemRHbHZiaU9pTVN3aW1XMTFiR3gwYjNKMmNteHZiV1VpT2pBd0xDSnBjeFpsYlhWc1lYUnZjbWxmYzJOdmNtVWlPaUptWVd4elpYUnzcpXp6yYmNjU3mYWRjYnpGSmYyZ3ZkbWxqYTI5dWJtVnNJaW9pTVN3aWljbVpzWldGelpWOWphR0Z1Ym1Wc0lqb2lZVzVreW05cFpDSXNJaUpyWld4bFlYTmxYMlpsY25OcGJjSXRhbTlrWlZOM0lpd2laWGh3SWpveE56YzNNamt6T1RBNGZRLm9Qa185X2pJQ2lydDZsS2ZFcVhReDBITENhVGRqMTNGSDBwMlhKQlo5ZGtI4uEgUiBodHRwczovL2F1dGhzcnYxLmFuZHJvaWRzcnZzLmNvbXogIBKCCV1jc292ZXJzZWEuc3Ryb25naG9sZC5mcmVlZmlyZW1vYmlsZS5jb207MzQuMTI2Ljc2LjQ1OzM0Ljg3LjE3Ny4xNDszNC44Ny4xNzAuMjMwOzM1LjE4NS4xODMuNTfopyDCz88fsqAgALEv6Z76vvdnICAgJDggIFIgurAgIKAgmpog7u13eiAwJFAnIEAAQA==`;

// Decode the template once at startup
const binaryTemplate = Buffer.from(BASE64_TEMPLATE, 'base64');
console.log(`✅ Loaded binary template (${binaryTemplate.length} bytes)`);

// Helper: extract JWT from binary (starts with "eyJ" and contains three dots)
function extractJwtFromBinary(bin) {
    const binStr = bin.toString('utf8');
    const match = binStr.match(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/);
    return match ? match[0] : null;
}

// Helper: replace JWT in binary
function replaceJwtInBinary(bin, newJwt) {
    const oldJwt = extractJwtFromBinary(bin);
    if (!oldJwt) throw new Error('No JWT found in template');
    const binStr = bin.toString('utf8');
    const newBinStr = binStr.replace(oldJwt, newJwt);
    return Buffer.from(newBinStr, 'utf8');
}

// Build login response with custom payload
function buildLoginResponse(customPayload) {
    const oldJwt = extractJwtFromBinary(binaryTemplate);
    if (!oldJwt) throw new Error('Template missing JWT');
    const [headerB64, oldPayloadB64, signatureB64] = oldJwt.split('.');
    
    // Decode old payload to preserve unknown fields
    let oldPayload = {};
    try {
        const oldPayloadJson = Buffer.from(oldPayloadB64, 'base64url').toString('utf8');
        oldPayload = JSON.parse(oldPayloadJson);
    } catch (e) {
        console.warn('Could not parse old payload, using empty');
    }
    
    // Merge custom fields (overwrites old values)
    const newPayload = { ...oldPayload, ...customPayload };
    // Force core_url to your IP
    newPayload.core_url = MY_IP;
    // Set expiration far in future (10 years)
    newPayload.exp = Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 3600;
    
    // Encode new payload
    const newPayloadB64 = Buffer.from(JSON.stringify(newPayload)).toString('base64url');
    const newJwt = `${headerB64}.${newPayloadB64}.${signatureB64}`;
    // Replace in binary and return
    return replaceJwtInBinary(binaryTemplate, newJwt);
}

// ─────────────────────────────────────────────────────────
// SSL Certificates (Let's Encrypt)
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
// 1. /ver.php – full version config (code:0, your URLs)
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
// 2. /MajorLogin – dynamically built binary using template
// ─────────────────────────────────────────────────────────
app.post('/MajorLogin', (req, res) => {
    console.log(`\n🎯 [MajorLogin] from ${req.ip}`);
    
    // =====================================================
    // EDIT THESE VALUES TO CHANGE PLAYER DATA
    // =====================================================
    const customPayload = {
        account_id: 123456789,           // change to any number
        nickname: "MyServer",            // custom nickname
        session_key: "ff_emulator_" + Date.now(),
        // You can also add: level, region, etc.
    };
    // =====================================================
    
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
// 3. /Ping – keep‑alive (simple OK)
// ─────────────────────────────────────────────────────────
app.post('/Ping', (req, res) => {
    console.log(`📡 [Ping]`);
    res.status(200).send("OK");
});

// 4. Catch‑all (Express 5 compatible)
app.all('/*splat', (req, res) => {
    if (['/ver.php', '/MajorLogin', '/Ping'].includes(req.path)) return;
    console.log(`🔎 [OTHER] ${req.method} ${req.path}`);
    res.status(200).send("OK");
});

// ─────────────────────────────────────────────────────────
// 5. TCP Core Server (port 7006) – game logic placeholder
// ─────────────────────────────────────────────────────────
const tcpServer = net.createServer((socket) => {
    const addr = socket.remoteAddress;
    console.log(`\n📡 [TCP CONNECT] ${addr}`);
    socket.on('data', (data) => {
        console.log(`📩 [TCP DATA] ${data.length} bytes from ${addr}`);
        // TODO: Implement actual game protocol
    });
    socket.on('error', (err) => console.log(`❌ TCP error: ${err.message}`));
    socket.on('close', () => console.log(`🔌 TCP closed: ${addr}`));
});
tcpServer.listen(TCP_PORT, '0.0.0.0', () => {
    console.log(`🚀 TCP Core listening on port ${TCP_PORT}`);
});

// ─────────────────────────────────────────────────────────
// 6. Start HTTP & HTTPS servers
// ─────────────────────────────────────────────────────────
http.createServer(app).listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`🌐 HTTP server on port ${HTTP_PORT}`);
});
https.createServer(sslOptions, app).listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`🔒 HTTPS server on port ${HTTPS_PORT}`);
});

console.log(`\n🚀 100% INDEPENDENT FREE FIRE EMULATOR`);
console.log(`🔗 Base URL: ${MY_URL_HTTPS}`);
console.log(`🎮 /MajorLogin generates custom binary (no external file needed)`);
console.log(`✨ To change player data, edit the customPayload object inside app.post('/MajorLogin')\n`);
