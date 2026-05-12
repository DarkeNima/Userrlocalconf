const https = require('https');
const protobuf = require('protobufjs');

const TARGET_HOST = 'loginbp.ggpolarbear.com';
const MY_DOMAIN = 'navivpn.sytes.net';

// උඹ කලින් මට එවපු BIN එකේ තිබ්බ නියම Protobuf දත්ත මල්ල
const REAL_STRUCTURE_HEX = "adc1e8e1f0390a02534712025347220253472a046c69766542d80165794a68624763694f694a49557a49314e694973496e4e3263694f694a314969776964486c77496a6f6953566455496e302e65794a6859324e766457353058326c6b496a6f784e54557a4e6a59784d6a4d354e7a7769626d6c6a61323568625755694f694a6d64314a4556555643576b743457566455514b464a496977626d3930615f793252476c766269494f694a5452314973496d787659327466636d566e61573975496f694a5452314973496d563464475679626d467358326c6b496f69497a4d314e4467315a57526a4d4745354e474d35597a5934595442695a4463795a444d324d7a45794d546732496977695a5868305a584a755957786664486c775a5349364e43776963477868645331705a4349364d537769593278705a57353058335a6c636e4e70623234694f6949784c6a45794d7a4c4e3869436c656d645778686447397958334e6a62334a6c496a6f774c43497361584e665a57313162474630623349694f6d5a6862484e6c4c43496959323931626e523558324e765a4755694f694a5452314973496d563464475679626d4673583356705a4349364e4433314f544d324e54557a4d4449344c434972636d566e5f4846325964474679496a6f784d4449774d4441304d446369776963323931636d4e6c496a6f774c4349736247396a613135795a476c76626f616e6c436c656d645778686447397958334e6a62334a6c496a6f784e7a63334d7a63794f5449354c434969593278705a57353058335235634755694f6949794c43497363326c6e626d463064584a6c5832316b4e534936496a63304d6a68694d6a557a5a47566d597a45324e4441784f474d324d4452684d575669596d5a6c596d526d4969776964584e70626d6366646d567963326c76626949364d537769636d56735a57467a5a51316a61474675626d5673496a6f695957356b636d39705a434973496d4a6c6247566863325666646d567963326c7662694936496b39434e544d694c4349695a586877496a6f784e54557a4e6a59784d6a4d354e7a77695a586877496a6f784e3763334e4441334f48453266512e484d4d4e462d5154535867685f32492d5449764f504a504f795f4d685333745a796f4e363533424d4632494801e18420522068747470733a2f2f61757468737276312e616e64726f6964737276732e636f6d7a2010031a0282205d63736f7665727365612e7374726f6e67686f6c642e66726565666972656d6f62696c652e636f6d3b33342e3132362e37362e34353b33342e38372e3137372e31343b33342e38372e3137302e3233303b33352e3138352e3138332e3537a80101c8cdc2cf01b201014d36fa95685767f70101210140205225ba01017c20899b787777f201012140412040260a";

const root = protobuf.Root.fromJSON({
    nested: {
        MajorLoginResponse: {
            fields: {
                field1: { type: "uint64", id: 1 },
                field2: { type: "string", id: 2 },
                field10: { type: "string", id: 10 },
                field16: { type: "string", id: 16 },
                field19: { type: "string", id: 19 }
            }
        }
    }
});
const LoginResponseMsg = root.lookupType("MajorLoginResponse");

module.exports = function(app) {
    app.all(/.*/, (req, res) => {
        if (req.url.includes('/ver.php')) return;

        console.log(`🔍 [INCOMING] ${req.method} ${req.url}`);

        // 🔥 GetLoginData ඉල්ලනකොට සර්වර් එකට යන්නේ නැතුව අපේ BIN එක දෙමු
        if (req.url.includes('GetLoginData')) {
            console.log(`🚀 [PRIVATE SERVER] Injecting Captured Account Data!`);
            res.setHeader('content-type', 'application/octet-stream');
            res.status(200).send(Buffer.from(REAL_STRUCTURE_HEX, 'hex'));
            return;
        }

        const host = req.url.includes('Account') ? 'clientbp.ggpolarbear.com' : 'loginbp.ggpolarbear.com';
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
                        decoded.field10 = `https://${MY_DOMAIN}`; 
                        buffer = LoginResponseMsg.encode(LoginResponseMsg.create(decoded)).finish();
                        console.log(`🚀 [CONTROL] Redirected to: ${MY_DOMAIN}`);
                    } catch (e) {
                        console.log(`❌ Error: ${e.message}`);
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
