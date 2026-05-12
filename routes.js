const https = require('https');
const protobuf = require('protobufjs');

const TARGET_HOST = 'loginbp.ggpolarbear.com';
const MY_IP = '103.6.168.170';
const TCP_PORT = 7006;

// --- Protobuf Schema (Stable for OB53) ---
const root = protobuf.Root.fromJSON({
    nested: {
        MajorLoginResponse: {
            fields: {
                field1: { type: "uint64", id: 1 },
                field2: { type: "string", id: 2 },
                field3: { type: "string", id: 3 },
                field4: { type: "string", id: 4 },
                field5: { type: "string", id: 5 },
                field8: { type: "string", id: 8 },
                field9: { type: "uint32", id: 9 },
                field10: { type: "string", id: 10 },
                field15: { type: "Field15Msg", id: 15 },
                field16: { type: "string", id: 16 },
                field19: { type: "string", id: 19 },
                field21: { type: "uint32", id: 21 },
                field22: { type: "bytes", id: 22 },
                field23: { type: "bytes", id: 23 },
                field24: { type: "string", id: 24 },
                field25: { type: "Field25Msg", id: 25 }
            }
        },
        Field15Msg: { fields: { sub1: { type: "uint32", id: 1 } } },
        Field25Msg: {
            fields: {
                sub1: { type: "string", id: 1 },
                sub2: { type: "uint32", id: 2 },
                sub5: { type: "uint32", id: 5 },
                sub6: { type: "uint32", id: 6 },
                sub7: { type: "uint32", id: 7 }
            }
        }
    }
});
const LoginResponseMsg = root.lookupType("MajorLoginResponse");

module.exports = function(app) {

    app.all(/.*/, (req, res) => {
        // Skip ver.php because it's handled in index.js
        if (req.url.includes('/ver.php')) return;

        console.log(`🔍 [INCOMING] ${req.method} ${req.url}`);

        let host = TARGET_HOST;
        // Account Data & Player Data routing
        if (req.url.includes('Account') || req.url.includes('GetLoginData') || req.url.includes('Component')) {
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

                // --- 💉 1. MajorLogin Live Injection ---
                if (req.url.includes('/MajorLogin')) {
                    try {
                        const decoded = LoginResponseMsg.decode(buffer);
                        const myTarget = `${MY_IP}:${TCP_PORT}`;

                        // TCP Targets (Redirection to our VPS)
                        decoded.field16 = myTarget;
                        decoded.field24 = myTarget;

                        // Field 19 IP List (Redirecting all secondary IPs to us)
                        if (decoded.field19 && decoded.field19.includes(';')) {
                            decoded.field19 = MY_IP;
                        }

                        buffer = LoginResponseMsg.encode(LoginResponseMsg.create(decoded)).finish();
                        console.log(`🎯 [MajorLogin] Live Injection Done! (TCP: ${myTarget})`);
                    } catch (e) {
                        console.log(`❌ Protobuf Decode Error in MajorLogin: ${e.message}`);
                    }
                }

                // --- 📦 2. GetLoginData Sniper (Analyze for Private Server) ---
                if (req.url.includes('GetLoginData')) {
                    console.log(`\n✅ [CAPTURED] GetLoginData Response!`);
                    console.log(`📦 Length: ${buffer.length} bytes`);
                    
                    // මුල් HEX 500 ලොග් කරනවා structure එක බලන්න
                    const hexPart = buffer.toString('hex').substring(0, 500);
                    console.log(`📝 HEX Snippet: ${hexPart}`);

                    /* TODO: මෙතනදී තමයි Diamonds/Items Inject කරන්නේ.
                       ඉස්සෙල්ලා ලොග් එක බලලා IDs ටික හොයාගමු.
                    */
                }

                // Forward the response to the game
                Object.keys(proxyRes.headers).forEach(k => res.setHeader(k, proxyRes.headers[k]));
                res.status(proxyRes.statusCode).send(buffer);
            });
        });

        proxyReq.on('error', (e) => {
            console.log(`❌ Proxy Err: ${e.message}`);
            res.status(500).send("");
        });

        if (req.rawBody) proxyReq.write(req.rawBody);
        proxyReq.end();
    });
};
