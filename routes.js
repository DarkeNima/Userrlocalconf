const https = require('https');
const fs = require('fs');
const protobuf = require('protobufjs');

const TARGET_HOST = 'loginbp.ggpolarbear.com';

// 🎯 MajorLogin එකේ structure එක හරියටම අල්ලගන්න
const root = protobuf.Root.fromJSON({
    nested: {
        MajorLoginResponse: {
            fields: {
                field1: { type: "uint64", id: 1 },
                field2: { type: "string", id: 2 },
                field10: { type: "string", id: 10 }, // 👈 මේක තමයි Client Service URL එක
                field16: { type: "string", id: 16 },
                field19: { type: "string", id: 19 }
            }
        }
    }
});
const LoginResponseMsg = root.lookupType("MajorLoginResponse");

module.exports = function(app) {
    app.all(/.*/, (req, res) => {
        if (req.url.includes('/ver.php')) return;

        let host = req.url.includes('Account') ? 'clientbp.ggpolarbear.com' : 'loginbp.ggpolarbear.com';
        console.log(`📡 [TRAFFIC] ${req.method} -> ${host}${req.url}`);

        const options = {
            hostname: host, port: 443, path: req.url, method: req.method,
            headers: { ...req.headers, 'host': host }
        };

        const proxyReq = https.request(options, (proxyRes) => {
            let resChunks = [];
            proxyRes.on('data', chunk => resChunks.push(chunk));
            proxyRes.on('end', () => {
                let buffer = Buffer.concat(resChunks);

                // 🎯 මෙතනදී තමයි ගේම් එක අපේ VPS එකට හරවන්නේ
                if (req.url.includes('/MajorLogin')) {
                    try {
                        const decoded = LoginResponseMsg.decode(buffer);
                        // ඊළඟට දත්ත ඉල්ලන්න අපේ VPS එකට එන්න කියලා ගේම් එකට කියනවා
                        decoded.field10 = `https://navivpn.sytes.net`; 
                        buffer = LoginResponseMsg.encode(LoginResponseMsg.create(decoded)).finish();
                        console.log(`🚀 [REDIRECT] Successfully redirected game to VPS!`);
                    } catch (e) {
                        console.log(`❌ Proto Decode Error: ${e.message}`);
                    }
                }

                // ✅ දැන් මෙතනට /GetLoginData අනිවාර්යයෙන් එන්න ඕනේ
                if (req.url.includes('GetLoginData')) {
                    console.log(`💎 [SUCCESS] Captured Real Account Data Structure!`);
                    fs.writeFileSync('real_account_structure.bin', buffer);
                }

                Object.keys(proxyRes.headers).forEach(k => res.setHeader(k, proxyRes.headers[k]));
                res.status(proxyRes.statusCode).send(buffer);
            });
        });

        proxyReq.on('error', (e) => res.status(500).send(""));
        if (req.rawBody) proxyReq.write(req.rawBody);
        proxyReq.end();
    });
};
