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
// 1. Embedded binary template (999 bytes – exact as captured)
// ─────────────────────────────────────────────────────────
const BASE64_TEMPLATE = `CNmE7440EgJTRxoCU0ciAlNHKgRsaXZlQpUGZXlKaGJHY2lPaUpJVXpJMU5pSXNJbk4yY2lJNklqRWlMQ0owZVhBaU9pSktWMVFpZlEuZXlKaFkyTnZkVzUwWDJsa0lqb3hNems0T1RneU16QTJOU3dpYm1samEyNWhiV1VpT2lKbU5GTkNkVTVwVFhjMmNrazRkWFZJTUU5UldFRkJSMGhxWldzOUlpd2libTkwYV9jbVdubHZiaU9pVTBjaUxTMWtiMk5yWTI5dVpXNWxYbkpsWjJsdmJpT2lVMENpTENKbWVYUmxjbTVoYmZocFpDSTZJbUU0TVRaaE56WmxZak00Tnpoak9ESmpOelZtT1RFeE1ERXhZVEUyT0dSbElpd2laWGwwWlhKdVlXeGZkSGx3WlNJNk1URXNJaHBzWVhSMFlXUmZpRE9qTVN3aW1HeGxiVzUwWDIxbGNuTnBiMjVpSWpvaU1TNHhNak11T0N0emRXNWxkbkpsYm5WemRHbHZiaU9pTVN3aW1XMTFiR3gwYjNKMmNteHZiV1VpT2pBd0xDSnBjeFpsYlhWc1lYUnZjbWxmYzJOdmNtVWlPaUptWVd4elpYUnzcpXp6yYmNjU3mYWRjYnpGSmYyZ3ZkbWxqYTI5dWJtVnNJaW9pTVN3aWljbVpzWldGelpWOWphR0Z1Ym1Wc0lqb2lZVzVreW05cFpDSXNJaUpyWld4bFlYTmxYMlpsY25OcGJjSXRhbTlrWlZOM0lpd2laWGh3SWpveE56YzNNamt6T1RBNGZRLm9Qa185X2pJQ2lydDZsS2ZFcVhReDBITENhVGRqMTNGSDBwMlhKQlo5ZGtI4uEgUiBodHRwczovL2F1dGhzcnYxLmFuZHJvaWRzcnZzLmNvbXogIBKCCV1jc292ZXJzZWEuc3Ryb25naG9sZC5mcmVlZmlyZW1vYmlsZS5jb207MzQuMTI2Ljc2LjQ1OzM0Ljg3LjE3Ny4xNDszNC44Ny4xNzAuMjMwOzM1LjE4NS4xODMuNTfopyDCz88fsqAgALEv6Z76+2d/EhwkOAAAUgG6ARCAF5qQ+u13ehUwJFAFAEAC`;

let originalBinary = Buffer.from(BASE64_TEMPLATE, 'base64');
console.log(`✅ Loaded original binary (${originalBinary.length} bytes)`);

// ─────────────────────────────────────────────────────────
// Helper: extract JWT and its start/end indices
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
                return {
                    start: start,
                    end: end,
                    jwt: bin.slice(start, end + 1).toString('utf8')
                };
            }
        }
    }
    return null;
}

// ─────────────────────────────────────────────────────────
// Patch binary: replace specific fields in the JWT payload
// while keeping the overall binary length unchanged.
// We'll directly edit the base64url‑encoded payload string.
// ─────────────────────────────────────────────────────────
function patchLoginBinary(customPayload) {
    const info = extractJwtWithPosition(originalBinary);
    if (!info) throw new Error('JWT not found in template');
    const { start, end, jwt } = info;
    const parts = jwt.split('.');
    if (parts.length !== 3) throw new Error('Invalid JWT structure');
    const [header, oldPayloadB64, signature] = parts;
    
    // Decode old payload as UTF-8 string
    let oldPayloadStr = Buffer.from(oldPayloadB64, 'base64url').toString('utf8');
    let oldPayload;
    try {
        oldPayload = JSON.parse(oldPayloadStr);
    } catch(e) {
        oldPayload = {};
    }
    
    // Merge custom fields
    const newPayload = { ...oldPayload, ...customPayload };
    // Force core_url to your IP
    newPayload.core_url = MY_IP;
    // Ensure expiration is far in future (10 years)
    newPayload.exp = Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 3600;
    
    // Generate new payload JSON string (compact, no spaces)
    let newPayloadStr = JSON.stringify(newPayload);
    let oldPayloadLen = oldPayloadStr.length;
    let newPayloadLen = newPayloadStr.length;
    
    // Adjust length to match original by padding with spaces or null bytes
    if (newPayloadLen < oldPayloadLen) {
        // Pad with spaces inside the JSON string (e.g., after colons or at end)
        // We'll add spaces before the closing brace.
        const padCount = oldPayloadLen - newPayloadLen;
        newPayloadStr = newPayloadStr.slice(0, -1) + ' '.repeat(padCount) + '}';
    } else if (newPayloadLen > oldPayloadLen) {
        // Truncate (or throw error) – you can adjust your custom fields
        console.warn(`New payload too long (${newPayloadLen} > ${oldPayloadLen}), truncating.`);
        newPayloadStr = newPayloadStr.slice(0, oldPayloadLen);
    }
    
    // Re‑encode as base64url
    const newPayloadB64 = Buffer.from(newPayloadStr, 'utf8').toString('base64url');
    const newJwt = `${header}.${newPayloadB64}.${signature}`;
    const newJwtBuffer = Buffer.from(newJwt, 'utf8');
    
    // Replace JWT in original binary (should be same length)
    if (newJwtBuffer.length !== (end - start + 1)) {
        throw new Error(`JWT length mismatch: original ${end-start+1}, new ${newJwtBuffer.length}`);
    }
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
app.post('/MajorLogin', (req, res) => {
    console.log(`\n🎯 [MajorLogin] from ${req.ip}`);
    // ========= EDIT YOUR CUSTOM DATA HERE =========
    const customPayload = {
        account_id: 123456789,         // any integer
        nickname: "MyEmu",             // keep short (will be padded with spaces)
        // session_key not needed – keep original
    };
    // =============================================
    try {
        const patchedBinary = patchLoginBinary(customPayload);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.status(200).send(patchedBinary);
        console.log(`✅ Sent patched binary (${patchedBinary.length} bytes) for account ${customPayload.account_id}`);
    } catch (err) {
        console.error(`❌ Patching error:`, err.message);
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

// Catch‑all
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
});
tcpServer.listen(TCP_PORT, '0.0.0.0', () => console.log(`🚀 TCP Core on ${TCP_PORT}`));

// Start servers
http.createServer(app).listen(HTTP_PORT, '0.0.0.0', () => console.log(`🌐 HTTP on ${HTTP_PORT}`));
https.createServer(sslOptions, app).listen(HTTPS_PORT, '0.0.0.0', () => console.log(`🔒 HTTPS on ${HTTPS_PORT}`));

console.log(`\n🚀 LENGTH‑PRESERVING PATCHER ACTIVE`);
console.log(`🔗 ${MY_URL_HTTPS}`);
console.log(`📦 /MajorLogin always returns exactly 999 bytes (original length)`);
