const https = require('https');
const protobuf = require('protobufjs');

// Protobuf setup (ඔයාගේ කලින් code එකේ තිබුණ විදිහට)
// ... (root සහ LoginResponseMsg definition එක මෙතනට දාන්න)

module.exports = function(app) {
    app.all(/.*/, (req, res) => {
        if (req.url.includes('/ver.php')) return;

        console.log(`\n🔍 [INCOMING REQUEST] ${req.method} ${req.url}`);
        
        // 1. Header Scanner: Authorization header එක තියෙනවද කියලා බලනවා
        if (!req.headers['authorization']) {
            console.warn(`⚠️ [WARN] Missing Authorization Header in Request!`);
        } else {
            console.log(`✅ [INFO] Auth Header: ${req.headers['authorization'].substring(0, 30)}...`);
        }

        let host = 'loginbp.ggpolarbear.com'; 
        if (req.url.includes('Account') || req.url.includes('GetLoginData')) {
            host = 'clientbp.ggpolarbear.com';
        }

        const options = {
            hostname: host,
            port: 443,
            path: req.url,
            method: req.method,
            headers: { ...req.headers, 'host': host }
        };

        const proxyReq = https.request(options, (proxyRes) => {
            console.log(`📡 [OUTGOING RESPONSE] Status: ${proxyRes.statusCode}`);
            
            // 2. Response Scanner: සර්වර් එකෙන් Error එකක් එවනවද කියලා බලනවා
            if (proxyRes.statusCode !== 200) {
                console.error(`❌ [SERVER ERROR] Garena returned ${proxyRes.statusCode} for ${req.url}`);
            }

            let resChunks = [];
            proxyRes.on('data', chunk => resChunks.push(chunk));
            proxyRes.on('end', () => {
                let buffer = Buffer.concat(resChunks);

                // 3. Payload Scanner: MajorLogin එකේදී decode වෙනවද බලනවා
                if (req.url.includes('/MajorLogin')) {
                    try {
                        const decoded = LoginResponseMsg.decode(buffer);
                        console.log(`📦 [PROTOBUF] Successfully decoded MajorLoginResponse`);
                        
                        // මෙතනදී ඔයාගේ Modification එක කරනවා
                        decoded.field10 = `https://navivpn.sytes.net`;
                        decoded.field19 = `103.6.168.170`;

                        buffer = LoginResponseMsg.encode(LoginResponseMsg.create(decoded)).finish();
                    } catch (e) {
                        console.error(`❌ [DECODE ERROR] Failed to decode Protobuf: ${e.message}`);
                    }
                }

                // Header ටික ආපහු සෙට් කරනවා
                Object.keys(proxyRes.headers).forEach(k => res.setHeader(k, proxyRes.headers[k]));
                res.status(proxyRes.statusCode).send(buffer);
            });
        });

        proxyReq.on('error', (e) => {
            console.error(`🚨 [PROXY CRITICAL] ${e.message}`);
            res.status(500).send("Proxy Error");
        });

        if (req.rawBody) {
            proxyReq.write(req.rawBody);
        }
        proxyReq.end();
    });
};
