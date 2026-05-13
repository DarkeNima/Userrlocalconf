const https = require('https');
const protobuf = require('protobufjs');
const fs = require('fs');

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

let validBearerToken = ""; // මෙතන "Bearer eyJhbGci..." සම්පූර්ණයෙන් තියෙනවා

module.exports = function(app) {
    app.all(/.*/, (req, res) => {
        // ver.php ට බාධා නොකරන්න (index.js එකේ එය හසුරුවයි)
        if (req.url.includes('/ver.php')) return;

        const allowedPaths = ['/MajorLogin', '/GetLoginData', '/Ping', '/Account'];
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
            // Authorization header එක capture කරන්න (Bearer token එක)
            if (key.toLowerCase() === 'authorization' && val && val.startsWith('Bearer ')) {
                if (!validBearerToken) {
                    validBearerToken = val;
                    console.log(`🔑 Captured Bearer token (length: ${val.length})`);
                    console.log(`🔑 Preview: ${val.substring(0, 50)}...`);
                }
            }
        }

        // /GetLoginData request එකට බලෙන් token එක inject කරන්න
        if (req.url.includes('/GetLoginData')) {
            if (validBearerToken) {
                proxyHeaders['Authorization'] = validBearerToken;
                console.log(`💉 Injected token into /GetLoginData`);
            } else {
                console.log(`⚠️ No token available yet, waiting for /MajorLogin request`);
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
                        // Modify response to redirect client to your private server
                        //decoded.field10 = `https://${MY_DOMAIN}`;
                        //decoded.field16 = `${MY_IP}:${TCP_PORT}`;
                        //decoded.field19 = MY_IP;
                        //decoded.field24 = `${MY_IP}:${TCP_PORT}`;
                        buffer = LoginResponseMsg.encode(decoded).finish();
                        console.log(`🎯 MajorLogin response modified -> redirect to ${MY_IP}:${TCP_PORT}`);
                    } catch (err) {
                        console.error(`❌ Protobuf decode error: ${err.message}`);
                    }
                }

                if (req.url.includes('/GetLoginData')) {
                    const responseText = buffer.toString('utf8');
                    if (responseText.includes('Authorization header must be Bearer') ||
                        responseText.includes('invalid number of segments') ||
                        responseText.includes('expired') ||
                        responseText.includes('Session has expired')) {
                        console.log(`❌ Garena error: ${responseText.substring(0, 200)}`);
                        const filename = `GetLoginData_ERROR_${Date.now()}.txt`;
                        fs.writeFileSync(filename, buffer);
                        console.log(`💾 Error saved to ${filename}`);
                    } else {
                        const filename = `GetLoginData_SUCCESS_${Date.now()}.bin`;
                        fs.writeFileSync(filename, buffer);
                        console.log(`✅ SUCCESS! Saved to ${filename}`);
                        console.log(`📄 Preview: ${responseText.substring(0, 300)}`);
                    }
                }

                Object.keys(proxyRes.headers).forEach(k => res.setHeader(k, proxyRes.headers[k]));
                res.status(proxyRes.statusCode).send(buffer);
            });
        });

        proxyReq.on('error', (err) => {
            console.error(`❌ Proxy error: ${err.message}`);
            res.status(500).send("");
        });
        if (req.rawBody) proxyReq.write(req.rawBody);
        proxyReq.end();
    });
};
