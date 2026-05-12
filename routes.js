const https = require('https');
const protobuf = require('protobufjs');

const TARGET_HOST = 'loginbp.ggpolarbear.com';
const MY_IP = '103.6.168.170';
const TCP_PORT = 7006;

// Schema එකේ Field IDs හරියටම තියෙන්න ඕනේ
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
        Field25Msg: { fields: { sub1: { type: "string", id: 1 }, sub2: { type: "uint32", id: 2 }, sub5: { type: "uint32", id: 5 }, sub6: { type: "uint32", id: 6 }, sub7: { type: "uint32", id: 7 } } }
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
                        const decoded = LoginResponseMsg.decode(buffer);
                        
                        // 🔥 මෙතනදී අපි පරණ Token (field2) මාරු කරන්නේ නැහැ.
                        // ඒක Live ආපු එක ඒ විදිහටම තියෙන්න දෙනවා.
                        
                        // IPs සහ TCP Ports විතරක් අපේ එකට හරවනවා
                        decoded.field16 = `${MY_IP}:${TCP_PORT}`;
                        decoded.field24 = `${MY_IP}:${TCP_PORT}`;
                        
                        // Field 19 එකේ IPs ලැයිස්තුවක් තිබුණොත් ඒකත් අපේ IP එකට හරවනවා
                        if (decoded.field19 && decoded.field19.includes(';')) {
                            decoded.field19 = MY_IP;
                        }

                        buffer = LoginResponseMsg.encode(LoginResponseMsg.create(decoded)).finish();
                        console.log(`🎯 [MajorLogin] Live Injection Done!`);
                    } catch (e) {
                        console.log(`❌ Protobuf Error: ${e.message}`);
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
