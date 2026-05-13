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

// Store the original token from the first request (it's valid for GetLoginData)
let validAuthToken = "";

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
            if (key.toLowerCase() === 'authorization') {
                // Save the original token (this is the real Bearer token)
                if (!validAuthToken) {
                    validAuthToken = val;
                    console.log(`🔑 Original Bearer token captured: ${val.substring(0, 50)}...`);
                    console.log(`📏 Token length: ${val.length}`);
                }
            }
        }

        // FORCE inject the original token for /GetLoginData
        if (req.url.includes('/GetLoginData')) {
            if (validAuthToken) {
                proxyHeaders['Authorization'] = validAuthToken;
                console.log(`💉 Injected original token into /GetLoginData`);
            } else {
                console.log(`⚠️ No token available yet`);
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
                        // (Optional) decode and log fields to see if any useful token exists, but we ignore field2 now.
                        if (decoded.field2) {
                            console.log(`ℹ️ field2 (ignored): ${decoded.field2}`);
                        }
                        // Modify server redirection
                        decoded.field10 = `https://${MY_DOMAIN}`;
                        decoded.field16 = `${MY_IP}:${TCP_PORT}`;
                        decoded.field19 = MY_IP;
                        decoded.field24 = `${MY_IP}:${TCP_PORT}`;
                        buffer = LoginResponseMsg.encode(decoded).finish();
                        console.log(`🎯 MajorLogin redirected to ${MY_IP}:${TCP_PORT}`);
                    } catch (err) {
                        console.error(`Protobuf error: ${err.message}`);
                    }
                }

                if (req.url.includes('/GetLoginData')) {
                    const responseText = buffer.toString('utf8');
                    if (responseText.includes('token contains an invalid number of segments') ||
                        responseText.includes('Authorization header must be Bearer') ||
                        responseText.includes('expired')) {
                        console.log(`❌ ERROR: ${responseText.substring(0, 200)}`);
                        fs.writeFileSync(`GetLoginData_ERROR_${Date.now()}.txt`, buffer);
                    } else {
                        // Success - save the real account data
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

        proxyReq.on('error', (err) => res.status(500).send(""));
        if (req.rawBody) proxyReq.write(req.rawBody);
        proxyReq.end();
    });
};
