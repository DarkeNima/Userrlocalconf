const https = require('https');
const protobuf = require('protobufjs');
const fs = require('fs');

const root = protobuf.Root.fromJSON({
    nested: {
        MajorLoginResponse: {
            fields: {
                field1: { type: "uint64", id: 1 },
                field2: { type: "string", id: 2 },   // ← REAL ACCESS TOKEN
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

let realAccessToken = "";   // මෙතන token B store කරන්නම්

module.exports = function(app) {
    app.all(/.*/, (req, res) => {
        if (req.url.includes('/ver.php')) return;

        const allowedPaths = ['/MajorLogin', '/GetLoginData', '/ver.php', '/Ping', '/Account'];
        const isAllowed = allowedPaths.some(path => req.url.includes(path));
        if (!isAllowed) {
            console.log(`🚫 BLOCKED: ${req.url}`);
            return res.status(403).send('Forbidden');
        }

        console.log(`\n🔍 ${req.method} ${req.url}`);

        let targetHost = 'loginbp.ggpolarbear.com';
        if (req.url.includes('Account') || req.url.includes('GetLoginData')) {
            targetHost = 'clientbp.ggpolarbear.com';
        }

        const proxyHeaders = {};
        for (let i = 0; i < req.rawHeaders.length; i += 2) {
            const key = req.rawHeaders[i];
            const val = req.rawHeaders[i + 1];
            if (key.toLowerCase() === 'host') {
                proxyHeaders[key] = targetHost;
            } else {
                proxyHeaders[key] = val;
            }
            // පැරණි token capture කරන්නත් ඕන නැහැ, නමුත් දාලා ගත්තම වරදක් නැහැ
            if (key.toLowerCase() === 'authorization') {
                console.log(`🔑 Old token captured (will NOT use): ${val.substring(0,20)}...`);
            }
        }

        // IMPORTANT: /GetLoginData request එකට inject කරන්නේ realAccessToken (field2 වලින් අල්ලපු එක)
        if (req.url.includes('/GetLoginData')) {
            if (realAccessToken) {
                proxyHeaders['Authorization'] = `Bearer ${realAccessToken}`;
                console.log(`💉 Injected REAL access token from field2: ${realAccessToken.substring(0,30)}...`);
            } else {
                console.log(`⚠️ No real access token yet. Waiting for /MajorLogin response.`);
            }
        }

        const options = {
            hostname: targetHost,
            port: 443,
            path: req.url,
            method: req.method,
            headers: proxyHeaders,
            rejectUnauthorized: false
        };

        const proxyReq = https.request(options, (proxyRes) => {
            let chunks = [];
            proxyRes.on('data', c => chunks.push(c));
            proxyRes.on('end', () => {
                let buffer = Buffer.concat(chunks);

                if (req.url.includes('/MajorLogin')) {
                    try {
                        const decoded = LoginResponseMsg.decode(buffer);
                        
                        // ★ CRITICAL: Extract real access token from field2
                        if (decoded.field2 && decoded.field2 !== "") {
                            realAccessToken = decoded.field2;
                            console.log(`🎯 [SUCCESS] Real access token extracted from field2: ${realAccessToken.substring(0,40)}...`);
                        } else {
                            console.log(`❌ field2 is empty!`);
                        }

                        // Modify server IP/domain
                        decoded.field10 = `https://${MY_DOMAIN}`;
                        decoded.field16 = `${MY_IP}:${TCP_PORT}`;
                        decoded.field19 = MY_IP;
                        decoded.field24 = `${MY_IP}:${TCP_PORT}`;
                        buffer = LoginResponseMsg.encode(decoded).finish();
                        console.log(`🎯 MajorLogin response modified (redirect to private server)`);
                    } catch (e) {
                        console.error(`Decode error: ${e.message}`);
                    }
                }

                if (req.url.includes('/GetLoginData')) {
                    const txt = buffer.toString('utf8');
                    if (txt.includes('Authorization header must be Bearer') || txt.includes('Invalid token') || txt.includes('expired')) {
                        console.log(`❌ Garena error: ${txt.substring(0,200)}`);
                        fs.writeFileSync(`error_${Date.now()}.txt`, buffer);
                    } else {
                        fs.writeFileSync(`GetLoginData_${Date.now()}.bin`, buffer);
                        console.log(`💾 Saved GetLoginData response (success?)`);
                    }
                }

                Object.keys(proxyRes.headers).forEach(k => res.setHeader(k, proxyRes.headers[k]));
                res.status(proxyRes.statusCode).send(buffer);
            });
        });

        proxyReq.on('error', (e) => {
            console.error(`Proxy error: ${e.message}`);
            res.status(500).send("");
        });
        if (req.rawBody) proxyReq.write(req.rawBody);
        proxyReq.end();
    });
};
