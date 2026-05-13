const https = require('https');
const protobuf = require('protobufjs');
const fs = require('fs'); // File system පාවිච්චි කරන්නේ දත්ත සේව් කරන්න

// MajorLogin Protobuf Structure එක
const root = protobuf.Root.fromJSON({
    nested: {
        MajorLoginResponse: {
            fields: {
                field1: { type: "uint64", id: 1 },
                field2: { type: "string", id: 2 },
                field10: { type: "string", id: 10 },
                field16: { type: "string", id: 16 },
                field19: { type: "string", id: 19 },
                field24: { type: "string", id: 24 }
            }
        }
    }
});
const LoginResponseMsg = root.lookupType("MajorLoginResponse");

const MY_DOMAIN = 'navivpn.sytes.net';
const MY_IP = '103.6.168.170';
const TCP_PORT = 7006;

module.exports = function(app) {
    app.all(/.*/, (req, res) => {
        if (req.url.includes('/ver.php')) return;

        console.log(`🔍 [INCOMING] ${req.method} ${req.url}`);

        // නියම සර්වර් ලිපිනය තෝරාගැනීම
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
            let resChunks = [];
            proxyRes.on('data', chunk => resChunks.push(chunk));
            proxyRes.on('end', () => {
                let buffer = Buffer.concat(resChunks);

                // 1. MajorLogin Modify කිරීම
                if (req.url.includes('/MajorLogin')) {
                    try {
                        const decoded = LoginResponseMsg.decode(buffer);
                        console.log("🎯 Modifying MajorLogin response...");

                        decoded.field10 = `https://${MY_DOMAIN}`;
                        decoded.field16 = `${MY_IP}:${TCP_PORT}`;
                        decoded.field19 = MY_IP;
                        decoded.field24 = `${MY_IP}:${TCP_PORT}`;

                        buffer = LoginResponseMsg.encode(LoginResponseMsg.create(decoded)).finish();
                        console.log("✅ Successfully Redirected to Private Server!");
                    } catch (e) {
                        console.error(`❌ [DECODE ERROR] ${e.message}`);
                    }
                }

                // 2. GetLoginData අල්ලාගෙන සේව් කිරීම (Dump)
                if (req.url.includes('/GetLoginData')) {
                    console.log("📦 [DATA] Intercepted GetLoginData! Saving for analysis...");
                    try {
                        // මේ එන බයිනරි දත්ත ටික ෆයිල් එකකට සේව් කරමු
                        const timestamp = Date.now();
                        const fileName = `GetLoginData_Response_${timestamp}.bin`;
                        fs.writeFileSync(fileName, buffer);
                        console.log(`💾 Saved Account Data to: ${fileName}`);
                        
                        // දැනට අපි Garena එකෙන් ආපු නියම දත්ත ටිකම ගේම් එකට යවනවා (Session එක කඩාවැටෙන්නේ නැති වෙන්න)
                    } catch (e) {
                        console.error(`❌ [SAVE ERROR] ${e.message}`);
                    }
                }

                // Header සහ Response එක ගේම් එකට යැවීම
                Object.keys(proxyRes.headers).forEach(k => res.setHeader(k, proxyRes.headers[k]));
                res.status(proxyRes.statusCode).send(buffer);
            });
        });

        proxyReq.on('error', (e) => res.status(500).send(""));
        if (req.rawBody) proxyReq.write(req.rawBody);
        proxyReq.end();
    });
};
