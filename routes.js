const https = require('https');
const fs = require('fs');

module.exports = function(app) {
    app.all(/.*/, (req, res) => {
        if (req.url.includes('/ver.php')) return;

        // 🔍 රික්වෙස්ට් එක යන හොස්ට් එක තෝරමු
        let targetHost = req.url.includes('Account') || req.url.includes('GetLoginData') 
                         ? 'clientbp.ggpolarbear.com' 
                         : 'loginbp.ggpolarbear.com';

        console.log(`📡 [TRAFFIC] ${req.method} -> ${targetHost}${req.url}`);

        const options = {
            hostname: targetHost,
            port: 443,
            path: req.url,
            method: req.method,
            headers: {
                ...req.headers,
                'host': targetHost // මේක අනිවාර්යයෙන්ම targetHost වෙන්න ඕනේ
            }
        };

        const proxyReq = https.request(options, (proxyRes) => {
            let resChunks = [];
            proxyRes.on('data', chunk => resChunks.push(chunk));
            proxyRes.on('end', () => {
                let buffer = Buffer.concat(resChunks);

                // ✅ ඇත්තම දත්ත මල්ල මෙතනදී සේව් කරගමු
                if (req.url.includes('GetLoginData') && proxyRes.statusCode === 200) {
                    console.log(`💎 [SUCCESS] Captured Real Account Data Structure!`);
                    fs.writeFileSync('real_account_structure.bin', buffer);
                }

                Object.keys(proxyRes.headers).forEach(k => res.setHeader(k, proxyRes.headers[k]));
                res.status(proxyRes.statusCode).send(buffer);
            });
        });

        proxyReq.on('error', (e) => {
            console.log(`❌ Error: ${e.message}`);
            res.status(500).send("");
        });

        if (req.rawBody) proxyReq.write(req.rawBody);
        proxyReq.end();
    });
};
