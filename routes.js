const https = require('https');
const protobuf = require('protobufjs');

const TARGET_HOST = 'loginbp.ggpolarbear.com';

// Protobuf structure එක (මේක හරියටම තියෙන්න ඕනේ decode කරන්න)
const root = protobuf.Root.fromJSON({
    nested: {
        AccountData: {
            fields: {
                field1: { type: "uint64", id: 1 },
                nickname: { type: "string", id: 10 },
                diamonds: { type: "uint32", id: 47 }, // 👈 උදාහරණයක් විදිහට diamonds field එක
                // තව fields මෙතනට දාන්න...
            }
        }
    }
});
const AccountMsg = root.lookupType("AccountData");

module.exports = function(app) {
    app.all(/.*/, (req, res) => {
        if (req.url.includes('/ver.php')) return;

        let host = req.url.includes('Account') ? 'clientbp.ggpolarbear.com' : 'loginbp.ggpolarbear.com';
        
        // 1. [REQUEST INTERCEPTION] - ගේම් එකෙන් සර්වර් එකට යන දත්ත
        console.log(`📡 [GAME -> SERVER] ${req.method} ${req.url}`);
        
        const options = {
            hostname: host,
            port: 443,
            path: req.url,
            method: req.method,
            headers: { ...req.headers, 'host': host }
        };

        const proxyReq = https.request(options, (proxyRes) => {
            let resChunks = [];
            proxyRes.on('data', chunk => resChunks.push(chunk));
            
            proxyRes.on('end', () => {
                let buffer = Buffer.concat(resChunks);

                // 2. [RESPONSE INTERCEPTION] - සර්වර් එකෙන් ගේම් එකට එන දත්ත
                if (req.url.includes('GetLoginData') && proxyRes.statusCode === 200) {
                    console.log(`💎 [INTERCEPTED] Modifying Account Data...`);
                    
                    try {
                        // දත්ත decode කරනවා
                        let decoded = AccountMsg.decode(buffer);
                        console.log(`👤 Original Nickname: ${decoded.nickname}`);

                        // 🔥 මෙතනදී අපිට ඕන දේ වෙනස් කරන්න පුළුවන්
                        decoded.diamonds = 99999; 
                        decoded.nickname = "MODDED_BY_NAVI";

                        // ආයේ encode කරලා ගේම් එකට යවනවා
                        buffer = AccountMsg.encode(AccountMsg.create(decoded)).finish();
                        console.log(`✅ [MODIFIED] Data sent to game!`);
                    } catch (e) {
                        console.log(`⚠️ Could not decode: ${e.message}`);
                    }
                }

                Object.keys(proxyRes.headers).forEach(k => res.setHeader(k, proxyRes.headers[k]));
                res.status(proxyRes.statusCode).send(buffer);
            });
        });

        proxyReq.on('error', (e) => res.status(500).send(""));
        
        // ගේම් එකෙන් ආපු original body එකම සර්වර් එකට යවනවා
        if (req.rawBody) proxyReq.write(req.rawBody);
        proxyReq.end();
    });
};
