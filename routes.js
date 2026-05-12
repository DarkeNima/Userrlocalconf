const https = require('https');
const protobuf = require('protobufjs');
const fs = require('fs');

const TARGET_HOST = 'loginbp.ggpolarbear.com';
const MY_DOMAIN = 'navivpn.sytes.net';
const MY_IP = '103.6.168.170';
const TCP_PORT = 7006;

// MajorLoginResponse structure එක
const root = protobuf.Root.fromJSON({
    nested: {
        MajorLoginResponse: {
            fields: {
                field1: { type: "uint64", id: 1 },
                field2: { type: "string", id: 2 }, // Token එක තියෙන්නේ මෙතන
                field10: { type: "string", id: 10 },
                field16: { type: "string", id: 16 },
                field19: { type: "string", id: 19 },
                field24: { type: "string", id: 24 }
            }
        }
    }
});
const LoginResponseMsg = root.lookupType("MajorLoginResponse");

// ගේම් එකෙන් එන Token එක තාවකාලිකව තියාගන්න variable එකක්
let lastCapturedToken = "";

module.exports = function(app) {

    app.all(/.*/, (req, res) => {
        if (req.url.includes('/ver.php')) return;

        let host = TARGET_HOST;
        
        // Headers ටික කොපි කරගනිමු
        let customHeaders = { ...req.headers };

        if (req.url.includes('Account') || req.url.includes('GetLoginData')) {
            host = 'clientbp.ggpolarbear.com';
            // 🔥 ගේම් එක GetLoginData ඉල්ලනකොට අපි MajorLogin එකෙන් අල්ලගත්ත Token එක බලෙන් දාමු
            if (lastCapturedToken) {
                customHeaders['authorization'] = `Bearer ${lastCapturedToken}`;
                console.log(`🔑 [AUTH] Using Captured Token for GetLoginData`);
            }
        }

        const options = {
            hostname: host,
            port: 443,
            path: req.url,
            method: req.method,
            headers: { ...customHeaders, 'host': host }
        };

        const proxyReq = https.request(options, (proxyRes) => {
            let resChunks = [];
            proxyRes.on('data', chunk => resChunks.push(chunk));
            proxyRes.on('end', () => {
                let buffer = Buffer.concat(resChunks);

                // 🎯 MajorLogin එකේදී Token එක අල්ලගන්න තැන
                if (req.url.includes('/MajorLogin')) {
                    try {
                        const decoded = LoginResponseMsg.decode(buffer);
                        
                        // Token එක Variable එකකට සේව් කරගන්නවා
                        lastCapturedToken = decoded.field2;
                        console.log(`✅ [TOKEN CAPTURED] Token: ${lastCapturedToken.substring(0, 20)}...`);

                        // Redirect පාර දානවා
                        decoded.field10 = `https://${MY_DOMAIN}`; 
                        decoded.field16 = `${MY_IP}:${TCP_PORT}`;
                        decoded.field24 = `${MY_IP}:${TCP_PORT}`;
                        decoded.field19 = MY_IP;

                        buffer = LoginResponseMsg.encode(LoginResponseMsg.create(decoded)).finish();
                        console.log(`🚀 [CONTROL] Redirected to: ${MY_DOMAIN}`);
                    } catch (e) {
                        console.log(`❌ Proto Error: ${e.message}`);
                    }
                }

                // 📦 දැන් මෙතනදී ගරේනා එකෙන් දෙන ඇත්තම Account Data ටික සේව් වෙනවා
                if (req.url.includes('GetLoginData') && proxyRes.statusCode === 200) {
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
