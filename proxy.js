const express = require('express');
const router = express.Router();
const https = require('https');
const config = require('./config');

// 🌐 General HTTPS Forwarding Function
function forwardToGarena(path, req, res) {
    const proxyHeaders = { ...req.headers };
    
    // Host එක අනිවාර්යයෙන්ම ගරීනා සර්වර් එකේ එක වෙන්න ඕනේ
    proxyHeaders['host'] = config.TARGET_HOST;
    
    // Gzip compression අයින් කරමු ලේසියෙන් කියවන්න
    delete proxyHeaders['accept-encoding'];
    delete proxyHeaders['content-length']; 

    if (req.rawBody) {
        proxyHeaders['content-length'] = req.rawBody.length;
    }

    const options = {
        hostname: config.TARGET_HOST,
        port: 443,
        path: path,
        method: 'POST',
        headers: proxyHeaders,
        timeout: 10000
    };

    const proxyReq = https.request(options, (proxyRes) => {
        let resChunks = [];
        proxyRes.on('data', chunk => resChunks.push(chunk));
        proxyRes.on('end', () => {
            const buffer = Buffer.concat(resChunks);
            
            // ටර්මිනල් එකේ විස්තර බලාගන්න
            console.log(`📦 [Data Captured] Path: ${path} | Status: ${proxyRes.statusCode} | Size: ${buffer.length} bytes`);
            
            // GetLoginData එකේ Hex ටික විතරක් වෙනම පෙන්වන්න
            if (path === '/GetLoginData' && buffer.length > 1) {
                console.log(`🔍 [Raw Hex Response]: ${buffer.toString('hex')}`);
            }

            res.status(proxyRes.statusCode);
            res.set(proxyRes.headers);
            res.send(buffer);
        });
    });

    proxyReq.on('error', (err) => {
        console.error(`❌ Forwarding Error (${path}):`, err.message);
        res.status(502).send("Bad Gateway");
    });

    if (req.rawBody) {
        proxyReq.write(req.rawBody);
    }
    proxyReq.end();
}

// 1️⃣ [MajorLogin] - මුකුත් වෙනස් කරන්නේ නැතුව පාස් කරනවා
router.post('/MajorLogin', (req, res) => {
    console.log(`\n🎯 [MajorLogin] Captured! Redirecting traffic...`);
    
    const options = {
        hostname: config.TARGET_HOST,
        port: 443,
        path: '/MajorLogin',
        method: 'POST',
        headers: { ...req.headers, 'host': config.TARGET_HOST }
    };

    const proxyReq = https.request(options, (proxyRes) => {
        let resChunks = [];
        proxyRes.on('data', chunk => resChunks.push(chunk));
        proxyRes.on('end', () => {
            let buffer = Buffer.concat(resChunks);
            
            // 🛠️ MAGIC TRICK: ඩේටා පැකට් එක ඇතුළේ තියෙන ගරීනා Domain එක අපේ IP එකට හරවමු
            let dataString = buffer.toString('binary');
            
            // ගරීනා Domain එක කොහේ තිබුණත් ඒක අපේ IP එකට හරවනවා
            const searchPattern = /csoversea\.stronghold\.freefiremobile\.com/g;
            if (dataString.match(searchPattern)) {
                console.log("🔗 Found Garena Domain! Redirecting to MY_IP...");
                dataString = dataString.replace(searchPattern, config.MY_IP);
                buffer = Buffer.from(dataString, 'binary');
            }

            res.status(proxyRes.statusCode);
            res.set(proxyRes.headers);
            res.send(buffer);
            console.log("✅ Redirection Injection Done.");
        });
    });

    proxyReq.write(req.rawBody);
    proxyReq.end();
});
;

// 2️⃣ [GetLoginData]
router.post('/GetLoginData', (req, res) => {
    console.log(`📡 [Proxying] /GetLoginData -> Garena`);
    forwardToGarena('/GetLoginData', req, res);
});

// 3️⃣ [GenerateNickname]
router.post('/GenerateNickname', (req, res) => {
    console.log(`📡 [Proxying] /GenerateNickname -> Garena`);
    forwardToGarena('/GenerateNickname', req, res);
});

// 4️⃣ [MajorRegister]
router.post('/MajorRegister', (req, res) => {
    console.log(`📡 [Proxying] /MajorRegister -> Garena`);
    forwardToGarena('/MajorRegister', req, res);
});

// Utility Routes
router.post('/Ping', (req, res) => { res.status(200).send("OK"); });
router.post('/webhook', (req, res) => { res.status(200).json({ "status": "ok" }); });

module.exports = router;
