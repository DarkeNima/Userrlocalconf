const express = require('express');
const router = express.Router();
const https = require('https');
const config = require('./config');

function forwardToGarena(path, req, res, callback = null) {
    const proxyHeaders = { ...req.headers };
    
    // වැදගත්: Host එක විදිහට Domain එකම තියෙන්න ඕනේ
    proxyHeaders['host'] = config.TARGET_HOST; 
    
    delete proxyHeaders['accept-encoding'];
    delete proxyHeaders['content-length'];

    if (req.rawBody) proxyHeaders['content-length'] = req.rawBody.length;

    const options = {
        // 🚀 මෙතනට ගරීනා එකේ සැබෑ IP එක දෙනවා (Loop එක නතර කරන්න)
        hostname: '203.116.141.134', 
        port: 443,
        path: path,
        method: 'POST',
        headers: proxyHeaders,
        rejectUnauthorized: false // Self-signed SSL ප්‍රශ්න මගහරින්න
    };

    const proxyReq = https.request(options, (proxyRes) => {
        let chunks = [];
        proxyRes.on('data', chunk => chunks.push(chunk));
        proxyRes.on('end', () => {
            const buffer = Buffer.concat(chunks);
            
            // 🎯 මෙතන තමයි අපේ Capture එක වෙන්නේ
            if (path === '/GetLoginData' || path === '/MajorLogin') {
                console.log(`\n📦 [DATA CAPTURED] Path: ${path} | Status: ${proxyRes.statusCode}`);
                console.log(`🔍 [HEX]: ${buffer.toString('hex')}\n`);
            }

            res.status(proxyRes.statusCode).set(proxyRes.headers).send(buffer);
        });
    });

    proxyReq.on('error', (e) => {
        console.error("❌ Proxy Forward Error:", e.message);
        res.status(502).send("Bad Gateway");
    });

    if (req.rawBody) proxyReq.write(req.rawBody);
    proxyReq.end();
}

module.exports = router;
