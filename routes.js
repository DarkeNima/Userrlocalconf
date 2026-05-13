const https = require('https');
const fs = require('fs');

module.exports = function(app) {
    app.all(/.*/, (req, res) => {
        if (req.url.includes('/ver.php')) return;
        
        console.log(`\n📥 ${req.method} ${req.url}`);
        console.log('📋 සියලුම Headers:');
        for (let i = 0; i < req.rawHeaders.length; i += 2) {
            console.log(`   ${req.rawHeaders[i]}: ${req.rawHeaders[i+1]}`);
        }
        
        // Original server එකට forward කරන්න (කිසිම modify එකක් නැතුව)
        let targetHost = 'loginbp.ggpolarbear.com';
        if (req.url.includes('Account') || req.url.includes('GetLoginData')) {
            targetHost = 'clientbp.ggpolarbear.com';
        }
        
        const proxyHeaders = {};
        for (let i = 0; i < req.rawHeaders.length; i += 2) {
            const key = req.rawHeaders[i];
            const val = req.rawHeaders[i+1];
            if (key.toLowerCase() === 'host') proxyHeaders[key] = targetHost;
            else proxyHeaders[key] = val;
        }
        
        const options = {
            hostname: targetHost,
            port: 443,
            path: req.url,
            method: req.method,
            headers: proxyHeaders,
            rejectUnauthorized: false
        };
        
        const proxyReq = https.request(options, (proxyRes) => {
            let chunks = [];
            proxyRes.on('data', c => chunks.push(c));
            proxyRes.on('end', () => {
                let buffer = Buffer.concat(chunks);
                if (req.url.includes('/GetLoginData')) {
                    const txt = buffer.toString('utf8');
                    console.log(`📤 GetLoginData Response Preview: ${txt.substring(0, 500)}`);
                }
                Object.keys(proxyRes.headers).forEach(k => res.setHeader(k, proxyRes.headers[k]));
                res.status(proxyRes.statusCode).send(buffer);
            });
        });
        proxyReq.on('error', err => res.status(500).send(''));
        if (req.rawBody) proxyReq.write(req.rawBody);
        proxyReq.end();
    });
};
