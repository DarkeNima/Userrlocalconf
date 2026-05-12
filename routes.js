const https = require('https');
const protobuf = require('protobufjs');

const TARGET_HOST = 'loginbp.ggpolarbear.com';
const MY_IP = '103.6.168.170';
const TCP_PORT = 7006;

// වඩාත් ගැලපෙන Schema එකක් හදමු
const root = protobuf.Root.fromJSON({
    nested: {
        MajorLoginResponse: {
            fields: {
                field1: { type: "uint64", id: 1 },
                field2: { type: "string", id: 2 },
                field3: { type: "string", id: 3 },
                field10: { type: "string", id: 10 },
                field16: { type: "string", id: 16 },
                field19: { type: "string", id: 19 },
                field24: { type: "string", id: 24 }
            }
        }
    }
});
const LoginResponseMsg = root.lookupType("MajorLoginResponse");

module.exports = function(app) {
    app.all(/.*/, (req, res) => {
        console.log(`🔍 [INCOMING] ${req.method} ${req.url}`);

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

                if (req.url.includes('/MajorLogin')) {
                    try {
                        // decode කරද්දී loose mode එක පාවිච්චි කරමු
                        const decoded = LoginResponseMsg.decode(buffer);
                        
                        // Injection logic
                        decoded.field16 = `${MY_IP}:${TCP_PORT}`;
                        decoded.field24 = `${MY_IP}:${TCP_PORT}`;
                        decoded.field10 = `https://navivpn.sytes.net`;

                        if (decoded.field19 && decoded.field19.includes(';')) {
                            decoded.field19 = MY_IP;
                        }

                        buffer = LoginResponseMsg.encode(LoginResponseMsg.create(decoded)).finish();
                        console.log(`🎯 [MajorLogin] Injected Successfully!`);
                    } catch (e) {
                        // Error එක මොකක්ද කියලා හරියටම බලමු
                        console.log(`❌ Protobuf Error Detail: ${e.message}`);
                        // Error එකක් ආවත් පරණ buffer එකම යවනවා ගේම් එක crash නොවී තියාගන්න
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
