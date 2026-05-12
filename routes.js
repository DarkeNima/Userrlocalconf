const https = require('https');
const protobuf = require('protobufjs');

const TARGET_HOST = 'loginbp.ggpolarbear.com';
const MY_DOMAIN = 'navivpn.sytes.net'; // උඹේ domain එක
const MY_IP = '103.6.168.170';
const TCP_PORT = 7006;

const root = protobuf.Root.fromJSON({
    nested: {
        MajorLoginResponse: {
            fields: {
                field1: { type: "uint64", id: 1 },
                field2: { type: "string", id: 2 }, // Token
                field10: { type: "string", id: 10 }, // Client Service URL (අපි මේක හරවනවා)
                field16: { type: "string", id: 16 }, // TCP Target
                field19: { type: "string", id: 19 }, // IP List
                field24: { type: "string", id: 24 }  // Backup TCP
            }
        }
    }
});
const LoginResponseMsg = root.lookupType("MajorLoginResponse");

module.exports = function(app) {

    // 🌐 ලොබියට ගියාම එන Account Data අපේ සර්වර් එකෙන්ම දෙමු
    app.post('/Account/GetLoginData', (req, res) => {
        console.log("🔥 [PRIVATE SERVER] Game is asking for Account Data!");
        
        /* මෙතනදී තමයි නියම සෙල්ලම තියෙන්නේ. 
           අපි ගරේනා එකට යන්නේ නැතුව, මෙතනින්ම අපේම response එකක් දෙනවා.
           දැනට මම මේක proxy වෙන්න ඉඩ හරින්නම් හැබැයි structure එක අල්ලගත්තම 
           අපිට මේක වෙනස් කරන්න පුළුවන්.
        */
       next(); // දැනට proxy එකට යවමු, හැබැයි field10 නිසා මේක එන්නේ අපේ සර්වර් එකටයි.
    });

    app.all(/.*/, (req, res) => {
        if (req.url.includes('/ver.php')) return;

        console.log(`🔍 [INCOMING] ${req.method} ${req.url}`);

        // ගේම් එක අපේ සර්වර් එකට රික්වෙස්ට් එවනකොට ඒක ගරේනා එකට හරවන්න (Proxy)
        let host = TARGET_HOST;
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

                if (req.url.includes('/MajorLogin')) {
                    try {
                        const decoded = LoginResponseMsg.decode(buffer);
                        
                        // 🎯 මේක තමයි ප්‍රධානම දේ: ගරේනා සර්වර් එක අයින් කරලා අපේ එක දැමීම
                        decoded.field10 = `https://${MY_DOMAIN}`; 
                        
                        // TCP එකත් අපේ එකට හරවමු
                        decoded.field16 = `${MY_IP}:${TCP_PORT}`;
                        decoded.field24 = `${MY_IP}:${TCP_PORT}`;
                        
                        // IPs ඔක්කොම අපේ එකට හරවමු
                        decoded.field19 = MY_IP;

                        buffer = LoginResponseMsg.encode(LoginResponseMsg.create(decoded)).finish();
                        console.log(`🚀 [CONTROL] Garena server removed. Redirected to: ${MY_DOMAIN}`);
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
