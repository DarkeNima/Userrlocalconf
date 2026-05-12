const https = require('https');
const fs = require('fs');

const TARGET_HOST = 'loginbp.ggpolarbear.com';

module.exports = function(app) {
    app.all(/.*/, (req, res) => {
        if (req.url.includes('/ver.php')) return;

        console.log(`🔍 [SNIFFING] ${req.method} ${req.url}`);

        let host = TARGET_HOST;
        if (req.url.includes('Account') || req.url.includes('GetLoginData')) {
            host = 'clientbp.ggpolarbear.com';
        }

        const options = {
            hostname: host, port: 443, path: req.url, method: req.method,
            headers: { ...req.headers, 'host': host }
        };

        const proxyReq = https.request(options, (proxyRes) => {
            let resChunks = [];
            proxyRes.on('data', chunk => resChunks.push(chunk));
            proxyRes.on('end', () => {
                let buffer = Buffer.concat(resChunks);

                // 🔥 මෙන්න මෙතනදී අපි GetLoginData එක අල්ලලා සේව් කරනවා
                if (req.url.includes('GetLoginData')) {
                    console.log(`✅ [CAPTURED] Saving real account data to file...`);
                    fs.writeFileSync('real_account_data.bin', buffer);
                }

                // ගේම් එකට දත්ත ටික ඒ විදිහටම යවනවා (දැනට Inject කරන්නේ නැහැ)
                Object.keys(proxyRes.headers).forEach(k => res.setHeader(k, proxyRes.headers[k]));
                res.status(proxyRes.statusCode).send(buffer);
            });
        });

        proxyReq.on('error', (e) => res.status(500).send(""));
        if (req.rawBody) proxyReq.write(req.rawBody);
        proxyReq.end();
    });
};
