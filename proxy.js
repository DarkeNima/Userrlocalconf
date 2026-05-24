const express = require('express');
const router = express.Router();
const https = require('https');
const config = require('./config');

function logAndForward(path, req, res) {
    const proxyHeaders = { ...req.headers };
    
    // Garena එක අපේ Request එක බාරගන්න Host එක නිවැරදිව තියෙන්න ඕනේ
    proxyHeaders['host'] = config.TARGET_HOST; 
    
    delete proxyHeaders['accept-encoding'];
    delete proxyHeaders['content-length'];

    if (req.rawBody) proxyHeaders['content-length'] = req.rawBody.length;

    const options = {
        hostname: config.TARGET_HOST, // versions.garenanow.live
        port: 443,
        path: path,
        method: req.method,
        headers: proxyHeaders,
        rejectUnauthorized: false // SSL Handshake ප්‍රශ්න මගහරින්න
    };

    // 1️⃣ Client (Phone) එකෙන් සර්වර් එකට යන දත්ත ලොග් කිරීම (Request)
    if (req.rawBody && req.rawBody.length > 0) {
        console.log(`\n⬆️ [CLIENT -> GARENA] Path: ${path}`);
        console.log(`🔍 [REQ HEX]: ${req.rawBody.toString('hex')}`);
    }

    const proxyReq = https.request(options, (proxyRes) => {
        let chunks = [];
        proxyRes.on('data', chunk => chunks.push(chunk));
        proxyRes.on('end', () => {
            const buffer = Buffer.concat(chunks);
            
            // 2️⃣ Garena එකෙන් Client (Phone) එකට එවන දත්ත ලොග් කිරීම (Response)
            console.log(`\n⬇️ [GARENA -> CLIENT] Path: ${path} | Status: ${proxyRes.statusCode}`);
            if (buffer.length > 0) {
                console.log(`🔍 [RES HEX]: ${buffer.toString('hex')}`);
            }

            // කිසිම වෙනසක් නොකර දත්ත ටික එහෙම්මම Phone එකට යවනවා
            const responseHeaders = { ...proxyRes.headers };
            delete responseHeaders['content-length']; 

            res.status(proxyRes.statusCode).set(responseHeaders).send(buffer);
        });
    });

    proxyReq.on('error', (e) => {
        console.error("❌ Proxy Connection Error:", e.message);
        res.status(502).send("Bad Gateway");
    });

    if (req.rawBody && req.method !== 'GET') proxyReq.write(req.rawBody);
    proxyReq.end();
}

// හැම Request එකක්ම මේකට අහුවෙනවා
// ❌ කලින් තිබුණ වැරදි ක්‍රමය:
// router.all('*', (req, res) => { ... });

//  අලුත් ක්‍රමය (Regex පාවිච්චි කරලා ඕනෑම පාරක් අල්ලනවා):
// 🎯 අලුත්ම Express වල ඕනෑම Path එකක් (Wildcard) අල්ලන්න නිවැරදි ක්‍රමය:
router.all('/:any*', (req, res) => {
    logAndForward(req.path, req, res);
});

module.exports = router;
