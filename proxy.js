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
    console.log(`\n🎯 [MajorLogin] Captured!`);
    
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
            try {
                const decoded = LoginResponseMsg.decode(buffer);
                
                // 💡 මෙතනදී අපි ඊළඟ රික්වෙස්ට් එක අපේ සර්වර් එකට ගන්න පාර හදනවා
                decoded.field10 = config.MY_URL_HTTPS; 

                // වෙන කිසිම දෙයක් වෙනස් කරන්නේ නැහැ (Signature එක බේරගන්න)
                const encoded = LoginResponseMsg.encode(decoded).finish();
                res.send(encoded);
                console.log("✅ field10 Redirected to Proxy.");
            } catch (e) {
                res.send(buffer);
            }
        });
    });
    proxyReq.write(req.rawBody);
    proxyReq.end();
});

// 2️⃣ [GetLoginData]
router.post('/GetLoginData', (req, res) => {
    console.log(`📡 [Proxying] /GetLoginData -> Fetching from Garena...`);
    
    // forwardToGarena පාවිච්චි කරලා ගරීනා එකෙන් දත්ත ගමු
    forwardToGarena('/GetLoginData', req, res, (garenaBuffer) => {
        // 💎 මෙතනදී තමයි අපි ඩයමන්ඩ්ස් වෙනස් කරන්නේ!
        console.log("🔍 Received data from Garena, now modifying...");
        
        // දැනට මුකුත් වෙනස් නොකර යවමු ලොග් වෙනවද බලන්න
        return garenaBuffer; 
    });
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
