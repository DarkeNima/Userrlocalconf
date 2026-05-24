const express = require('express');
const router = express.Router();
const https = require('https');
const config = require('./config');

function forwardToGarena(path, req, res, callback = null) {
    const proxyHeaders = { ...req.headers };
    proxyHeaders['host'] = config.TARGET_HOST;
    delete proxyHeaders['accept-encoding'];
    delete proxyHeaders['content-length'];

    if (req.rawBody) proxyHeaders['content-length'] = req.rawBody.length;

    const options = {
        hostname: config.TARGET_HOST,
        port: 443,
        path: path,
        method: 'POST',
        headers: proxyHeaders
    };

    const proxyReq = https.request(options, (proxyRes) => {
        let chunks = [];
        proxyRes.on('data', chunk => chunks.push(chunk));
        proxyRes.on('end', () => {
            const buffer = Buffer.concat(chunks);
            
            // ලොග්ස් බලාගන්න විතරක් මේක පාවිච්චි කරමු
            if (path === '/GetLoginData' || path === '/MajorLogin') {
                console.log(`📦 [Captured] ${path} | Size: ${buffer.length} bytes`);
                if (buffer.length > 0) {
                    console.log(`🔍 [Raw Hex]: ${buffer.toString('hex').substring(0, 100)}...`);
                }
            }

            res.status(proxyRes.statusCode).set(proxyRes.headers).send(buffer);
        });
    });

    proxyReq.on('error', (e) => {
        console.error("Proxy Error:", e.message);
        res.status(502).send("Bad Gateway");
    });

    if (req.rawBody) proxyReq.write(req.rawBody);
    proxyReq.end();
}

// හැම රික්වෙස්ට් එකක්ම අල්ලන්න (Catch-all)
router.post('*', (req, res) => {
    forwardToGarena(req.path, req, res);
});

module.exports = router;
