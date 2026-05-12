const https = require('https');
const fs = require('fs');

const TARGET_HOST = 'loginbp.ggpolarbear.com';

module.exports = function(app) {
    app.all(/.*/, (req, res) => {
        if (req.url.includes('/ver.php')) return;

        // 🔍 හැම රික්වෙස්ට් එකකම Host එකත් එක්කම ලොග් කරමු
        let host = TARGET_HOST;
        if (req.url.includes('Account') || req.url.includes('GetLoginData') || req.url.includes('Component')) {
            host = 'clientbp.ggpolarbear.com';
        }

        console.log(`📡 [${req.method}] ${host}${req.url}`);

        const options = {
            hostname: host, port: 443, path: req.url, method: req.method,
            headers: { ...req.headers, 'host': host }
        };

        const proxyReq = https.request(options, (proxyRes) => {
            let resChunks = [];
            proxyRes.on('data', chunk => resChunks.push(chunk));
            proxyRes.on('end', () => {
                let buffer = Buffer.concat(resChunks);

                // 📦 GetLoginData අහු වුණොත් අනිවාර්යයෙන් සේව් කරමු
                if (req.url.includes('GetLoginData')) {
                    console.log(`✅ [SUCCESS] Captured Account Data! Size: ${buffer.length} bytes`);
                    fs.writeFileSync('real_account_data.bin', buffer);
                }

                Object.keys(proxyRes.headers).forEach(k => res.setHeader(k, proxyRes.headers[k]));
                res.status(proxyRes.statusCode).send(buffer);
            });
        });

        proxyReq.on('error', (e) => {
            console.log(`❌ Connection Error to ${host}: ${e.message}`);
            res.status(500).send("");
        });

        if (req.rawBody) proxyReq.write(req.rawBody);
        proxyReq.end();
    });
};
