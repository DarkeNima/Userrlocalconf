const https = require('https');
const fs = require('fs');

const TARGET_HOST = 'clientbp.ggpolarbear.com';

module.exports = function(app) {
    app.all(/.*/, (req, res) => {
        if (req.url.includes('/ver.php')) return;

        // 🔍 රික්වෙස්ට් එක එන තැන අනුව ටාගට් එක තෝරමු
        let host = req.url.includes('GetLoginData') ? 'clientbp.ggpolarbear.com' : 'loginbp.ggpolarbear.com';
        
        console.log(`📡 [PROXY] Sending to ${host}${req.url}`);

        const options = {
            hostname: host,
            port: 443,
            path: req.url,
            method: req.method,
            headers: {
                ...req.headers,
                'host': host,
                // 🔥 ගරේනා එකෙන් Token එක චෙක් කරන නිසා මේක අනිවාර්යයි
                'authorization': req.headers['authorization'] 
            }
        };

        const proxyReq = https.request(options, (proxyRes) => {
            let resChunks = [];
            proxyRes.on('data', chunk => resChunks.push(chunk));
            proxyRes.on('end', () => {
                let buffer = Buffer.concat(resChunks);

                // ✅ මෙන්න මෙතනදී තමයි ඇත්තම Account Data ටික අහුවෙන්නේ
                if (req.url.includes('GetLoginData') && proxyRes.statusCode === 200) {
                    console.log(`💎 [SUCCESS] Real Account Data Captured!`);
                    fs.writeFileSync('real_data_structure.bin', buffer);
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
