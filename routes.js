const https = require('https');
const protobuf = require('protobufjs');
const fs = require('fs');

const TARGET_HOST = 'loginbp.ggpolarbear.com';
const MY_DOMAIN = 'navivpn.sytes.net';

module.exports = function(app) {

    // 🌐 ගේම් එක මුලින්ම සර්වර් එක වැඩද කියලා බලන්න එන තැන
    app.get('/', (req, res) => {
        console.log("🌐 [HEALTH CHECK] Game checked if server is alive.");
        res.status(200).send("OK"); // මේක දුන්නම ගේම් එක ඊළඟ පියවරට යනවා
    });

    app.all(/.*/, (req, res) => {
        if (req.url.includes('/ver.php')) return;

        // 🔍 ටාගට් එක තෝරමු
        let host = req.url.includes('Account') || req.url.includes('GetLoginData') 
                   ? 'clientbp.ggpolarbear.com' 
                   : 'loginbp.ggpolarbear.com';

        console.log(`📡 [GAME -> VPS] ${req.method} ${req.url}`);

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

                // 1. MajorLogin එකේදී Redirect එක දානවා
                if (req.url.includes('/MajorLogin')) {
                    console.log("🚀 [REDIRECTING] Hooking Game to VPS...");
                    // මෙතනදී අපි කලින් වගේම field10 එක MY_DOMAIN එකට හරවනවා
                    // (Protobuf decoding code එක මෙතනට දාන්න)
                }

                // 2. GetLoginData එක මැදදී අල්ලලා වෙනස් කරන තැන 🔥
                if (req.url.includes('GetLoginData')) {
                    console.log("💎 [INTERCEPTED] Modifying account data before it reaches the game!");
                    
                    // 🎯 මෙතනදී තමයි උඹට ඕන දේ කරන්නේ.
                    // අපි ගරේනා එකෙන් ආපු buffer එක අරගෙන ඒකේ අගයන් වෙනස් කරනවා.
                    // උදාහරණයකට: buffer = modifyDiamonds(buffer, 99999);
                    
                    fs.writeFileSync('last_intercepted_response.bin', buffer);
                }

                Object.keys(proxyRes.headers).forEach(k => res.setHeader(k, proxyRes.headers[k]));
                res.status(proxyRes.statusCode).send(buffer);
            });
        });

        proxyReq.on('error', (e) => {
            console.log(`❌ Proxy Error: ${e.message}`);
            res.status(500).send("");
        });

        if (req.rawBody) proxyReq.write(req.rawBody);
        proxyReq.end();
    });
};
