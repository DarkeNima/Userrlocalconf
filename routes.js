const https = require('https');
const protobuf = require('protobufjs');
const fs = require('fs');

// Protobuf schema එක (MajorLoginResponse සඳහා)
const root = protobuf.Root.fromJSON({
    nested: {
        MajorLoginResponse: {
            fields: {
                field1: { type: "uint64", id: 1 },
                field2: { type: "string", id: 2 },   // Potential token
                field10: { type: "string", id: 10 },
                field16: { type: "string", id: 16 },
                field19: { type: "string", id: 19 },
                field24: { type: "string", id: 24 }
            }
        }
    }
});
const LoginResponseMsg = root.lookupType("MajorLoginResponse");

// ඔයාගේ private server details
const MY_DOMAIN = 'navivpn.sytes.net';
const MY_IP = '103.6.168.170';
const TCP_PORT = 7006;

// Global variables
let realAccessToken = "";        // field2 එකෙන් අල්ලපු token
let originalAuthToken = "";      // request එකේ තිබුණු original token (Bearer)
let tokenSource = "none";

module.exports = function(app) {
    app.all(/.*/, (req, res) => {
        // ver.php ඉවත් කරන්න (game server එකට යන්න දෙන්න)
        if (req.url.includes('/ver.php')) return;

        // Allow only necessary paths
        
        console.log(`\n🔍 ${req.method} ${req.url}`);

        // Determine target host
        let targetHost = 'loginbp.ggpolarbear.com';
        if (req.url.includes('Account') || req.url.includes('GetLoginData')) {
            targetHost = 'clientbp.ggpolarbear.com';
        }

        // Build proxy headers (copy all, modify Host)
        const proxyHeaders = {};
        for (let i = 0; i < req.rawHeaders.length; i += 2) {
            const key = req.rawHeaders[i];
            const val = req.rawHeaders[i + 1];
            if (key.toLowerCase() === 'host') {
                proxyHeaders[key] = targetHost;
            } else {
                proxyHeaders[key] = val;
            }
            // Capture original Authorization token if present
            if (key.toLowerCase() === 'authorization') {
                originalAuthToken = val;
                console.log(`🔑 Original Auth token captured: ${val.substring(0, 50)}...`);
            }
        }

        // ---- Token injection logic for /GetLoginData ----
        if (req.url.includes('/GetLoginData')) {
            // Try to use realAccessToken (from field2) first
            if (realAccessToken && realAccessToken !== "") {
                proxyHeaders['Authorization'] = `Bearer ${realAccessToken}`;
                tokenSource = "field2";
                console.log(`💉 Injected token from field2: ${realAccessToken.substring(0, 40)}...`);
            } 
            // If field2 token is empty or not working, fallback to original token
            else if (originalAuthToken && originalAuthToken !== "") {
                proxyHeaders['Authorization'] = originalAuthToken;
                tokenSource = "originalRequest";
                console.log(`⚠️ Fallback: Using original request token: ${originalAuthToken.substring(0, 40)}...`);
            } 
            else {
                console.log(`❌ No token available to inject!`);
            }
        }

        // Proxy request options
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
            proxyRes.on('data', chunk => chunks.push(chunk));
            proxyRes.on('end', () => {
                let buffer = Buffer.concat(chunks);

                // --- Handle /MajorLogin response ---
                if (req.url.includes('/MajorLogin')) {
                    try {
                        const decoded = LoginResponseMsg.decode(buffer);
                        
                        // Extract field2 token (real access token for game server)
                        if (decoded.field2 && decoded.field2 !== "") {
                            realAccessToken = decoded.field2;
                            console.log(`🎯 [SUCCESS] Extracted field2 token: ${realAccessToken.substring(0, 50)}...`);
                            console.log(`📏 Token length: ${realAccessToken.length}`);
                        } else {
                            console.log(`⚠️ field2 is empty or missing`);
                        }

                        // Modify response to redirect client to your private server
                        decoded.field10 = `https://${MY_DOMAIN}`;
                        decoded.field16 = `${MY_IP}:${TCP_PORT}`;
                        decoded.field19 = MY_IP;
                        decoded.field24 = `${MY_IP}:${TCP_PORT}`;
                        
                        // Re-encode
                        buffer = LoginResponseMsg.encode(decoded).finish();
                        console.log(`🎯 MajorLogin response modified (redirect to ${MY_IP}:${TCP_PORT})`);
                    } catch (err) {
                        console.error(`❌ Protobuf decode error: ${err.message}`);
                    }
                }

                // --- Handle /GetLoginData response ---
                if (req.url.includes('/GetLoginData')) {
                    const responseText = buffer.toString('utf8');
                    // List of known error patterns from Garena
                    const errorPatterns = [
                        'token contains an invalid number of segments',
                        'Authorization header must be Bearer',
                        'Invalid token',
                        'expired',
                        'Session has expired'
                    ];
                    
                    const isError = errorPatterns.some(pattern => responseText.includes(pattern));
                    
                    if (isError) {
                        console.log(`❌ Garena error detected: ${responseText.substring(0, 200)}`);
                        const timestamp = Date.now();
                        const errorFile = `GetLoginData_ERROR_${timestamp}.txt`;
                        fs.writeFileSync(errorFile, buffer);
                        console.log(`💾 Error response saved to: ${errorFile}`);
                        
                        // Also log which token was used
                        console.log(`🔍 Token used for this request came from: ${tokenSource}`);
                    } else {
                        // Success path (probably JSON with account data)
                        const timestamp = Date.now();
                        const successFile = `GetLoginData_SUCCESS_${timestamp}.bin`;
                        fs.writeFileSync(successFile, buffer);
                        console.log(`✅ SUCCESS! Saved real account data to: ${successFile}`);
                        console.log(`📄 Response preview: ${responseText.substring(0, 300)}`);
                    }
                }

                // Forward response to client
                Object.keys(proxyRes.headers).forEach(k => res.setHeader(k, proxyRes.headers[k]));
                res.status(proxyRes.statusCode).send(buffer);
            });
        });

        proxyReq.on('error', (err) => {
            console.error(`🚨 Proxy request error: ${err.message}`);
            res.status(500).send("");
        });
        
        if (req.rawBody) proxyReq.write(req.rawBody);
        proxyReq.end();
    });
};
