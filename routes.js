const https = require('https');
const protobuf = require('protobufjs');
const fs = require('fs');

// Protobuf Structure
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

// ගේම් එකෙන් එන Token එක මතක තියාගන්න Global Variable එකක්
let capturedAuthToken = ""; 

module.exports = function(app) {
    app.all(/.*/, (req, res) => {
        if (req.url.includes('/ver.php')) return;

        // 🛡️ Attack Blocker: ගේම් එකේ එව්වා හැර වෙනත් URL ආවොත් Block කරනවා
        const allowedPaths = ['/MajorLogin', '/GetLoginData', '/ver.php', '/Ping', '/Account'];
        const isAllowed = allowedPaths.some(path => req.url.includes(path));
        if (!isAllowed) {
            console.log(`🚫 [BLOCKED] Suspicious request dropped: ${req.url}`);
            return res.status(403).send('Forbidden');
        }

        console.log(`\n🔍 [INCOMING] ${req.method} ${req.url}`);

        let targetHost = 'loginbp.ggpolarbear.com';
        if (req.url.includes('Account') || req.url.includes('GetLoginData')) {
            targetHost = 'clientbp.ggpolarbear.com';
        }

        // 🎯 Header Casing ආරක්ෂා කිරීම සහ Token එක ඇල්ලීම
        const proxyHeaders = {};
        for (let i = 0; i < req.rawHeaders.length; i += 2) {
            const key = req.rawHeaders[i];
            const val = req.rawHeaders[i + 1];
            
            if (key.toLowerCase() === 'host') {
                proxyHeaders[key] = targetHost; 
            } else {
                proxyHeaders[key] = val;
            }

            // Token එක අල්ලගන්නවා
            if (key.toLowerCase() === 'authorization') {
                capturedAuthToken = val; 
                console.log(`🔑 [AUTH] Token Captured successfully!`);
            }
        }

        // 💉 Token Injection: ගේම් එක GetLoginData එකට Token එක එව්වෙ නැත්නම් අපිම ඒක දානවා
        if (req.url.includes('/GetLoginData') && !proxyHeaders['Authorization']) {
            if (capturedAuthToken) {
                proxyHeaders['Authorization'] = capturedAuthToken;
                console.log(`💉 [INJECT] Re-injected captured Token to Garena request!`);
            } else {
                console.log(`⚠️ [WARNING] No Token available to inject! Session might fail.`);
            }
        }

        const options = {
            hostname: targetHost,
            port: 443,
            path: req.url,
            method: req.method,
            headers: proxyHeaders,
            rejectUnauthorized: false // SSL ප්‍රශ්න මඟහරින්න
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
                        decoded.field10 = `https://${MY_DOMAIN}`;
                        decoded.field16 = `${MY_IP}:${TCP_PORT}`;
                        decoded.field19 = MY_IP;
                        decoded.field24 = `${MY_IP}:${TCP_PORT}`;
                        buffer = LoginResponseMsg.encode(LoginResponseMsg.create(decoded)).finish();
                        console.log("🎯 [SUCCESS] MajorLogin Redirected to Private Server!");
                    } catch (e) {
                        console.error(`❌ [DECODE ERROR] ${e.message}`);
                    }
                }

                // 2. GetLoginData සේව් කිරීම
                if (req.url.includes('/GetLoginData')) {
                    const responseText = buffer.toString('utf8');
                    
                    // සර්වර් එකෙන් Error එකක් ආවොත් ෆයිල් එක සේව් කරන්නේ නැහැ
                    if (responseText.includes('Authorization header must be Bearer')) {
                        console.log(`❌ [GARENA ERROR] Failed to fetch data: Missing/Invalid Token!`);
                    } else {
                        const timestamp = Date.now();
                        const fileName = `GetLoginData_Response_${timestamp}.bin`;
                        fs.writeFileSync(fileName, buffer);
                        console.log(`💾 [SAVED] 100% Real Account Data saved to: ${fileName}`);
                    }
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
