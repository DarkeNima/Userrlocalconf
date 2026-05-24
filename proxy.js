const express = require('express');
const router = express.Router();
const https = require('https');
const config = require('./config');

function logAndForward(path, req, res) {
    const proxyHeaders = { ...req.headers };
    
    // Garena එකට අපි හරවන නිසා Host එක versions.garenanow.live විය යුතුයි
    proxyHeaders['host'] = config.TARGET_HOST; 
    
    delete proxyHeaders['accept-encoding'];
    delete proxyHeaders['content-length'];

    if (req.rawBody) proxyHeaders['content-length'] = req.rawBody.length;

    // 🎯 වැදගත්: ගේම් එකෙන් '/MajorLogin' ආවොත් ඒක '/live/MajorLogin' කරන්න ඕනේ.
    // හැබැයි දැනටමත් '/live/MajorLogin' කියලා ආවොත් ඒක එහෙම්මම ගන්නවා.
    const cleanPath = path.startsWith('/live') ? path : `/live${path}`;

    const options = {
        hostname: config.TARGET_HOST, // මෙතනට එන්නේ 'versions.garenanow.live' විතරයි
        port: 443,
        path: cleanPath,
        method: req.method,
        headers: proxyHeaders,
        rejectUnauthorized: false
    };

    // Client (Phone) එකෙන් සර්වර් එකට යන දත්ත ලොග් කිරීම
    if (req.rawBody && req.rawBody.length > 0) {
        console.log(`\n⬆️ [CLIENT -> GARENA] Path: ${cleanPath}`);
        console.log(`🔍 [REQ HEX]: ${req.rawBody.toString('hex')}`);
    }

    const proxyReq = https.request(options, (proxyRes) => {
        let chunks = [];
        proxyRes.on('data', chunk => chunks.push(chunk));
        proxyRes.on('end', () => {
            const buffer = Buffer.concat(chunks);
            
            // Garena එකෙන් අපිට එවන දත්ත ලොග් කිරීම
            console.log(`\n⬇️ [GARENA -> CLIENT] Path: ${cleanPath} | Status: ${proxyRes.statusCode}`);
            if (buffer.length > 0) {
                console.log(`🔍 [RES HEX]: ${buffer.toString('hex')}`);
            }

            const responseHeaders = { ...proxyRes.headers };
            delete responseHeaders['content-length']; 

            res.status(proxyRes.statusCode).set(responseHeaders).send(buffer);
        });
    });

    proxyReq.on('error', (e) => {
        console.error(`❌ Proxy Connection Error to (${config.TARGET_HOST}${cleanPath}):`, e.message);
        res.status(502).send("Bad Gateway");
    });

    if (req.rawBody && req.method !== 'GET') proxyReq.write(req.rawBody);
    proxyReq.end();
}

// RegExp එකෙන් හැම Request එකක්ම අල්ලනවා
router.all(/[\s\S]*/, (req, res) => {
    logAndForward(req.path, req, res);
});

module.exports = router;
