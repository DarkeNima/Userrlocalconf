const https = require('https');
const protobuf = require('protobufjs');

const TARGET_HOST = 'loginbp.ggpolarbear.com';
const MY_DOMAIN = 'navivpn.sytes.net'; 
const MY_IP = '103.6.168.170';
const TCP_PORT = 7006;

// ✅ අලුත් Protobuf Structure එක
const root = protobuf.Root.fromJSON({
    nested: {
        BlacklistInfoRes: { fields: { ban_reason: { type: "int32", id: 1 }, expire_duration: { type: "uint32", id: 2 }, ban_time: { type: "uint32", id: 3 } } },
        LoginQueueInfo: { fields: { allow: { type: "bool", id: 1 }, queue_position: { type: "uint32", id: 2 }, need_wait_secs: { type: "uint32", id: 3 }, queue_is_full: { type: "bool", id: 4 } } },
        FFAntiConfigDesc: { fields: { region: { type: "string", id: 1 }, enable: { type: "bool", id: 2 }, hpe_enable: { type: "bool", id: 3 }, ffi_enable: { type: "bool", id: 4 }, mtp_lite_data_enable: { type: "bool", id: 5 } } },
        MajorLoginRes: {
            fields: {
                account_id: { type: "uint64", id: 1 },
                lock_region: { type: "string", id: 2 },
                token: { type: "string", id: 8 },
                server_url: { type: "string", id: 10 },
                ip_city: { type: "string", id: 16 },
                ff_anti_config_desc: { type: "FFAntiConfigDesc", id: 22 }
            }
        },
        CSGetAccountBriefInfoBeforeLoginRes: {
            fields: {
                account_id: { type: "uint64", id: 1 },
                nickname: { type: "string", id: 2 },
                level: { type: "uint32", id: 5 },
                lock_reigon: { type: "string", id: 6 }
            }
        }
    }
});

const LoginRes = root.lookupType("MajorLoginRes");
const AccountBriefRes = root.lookupType("CSGetAccountBriefInfoBeforeLoginRes");

module.exports = function(app) {

    app.all(/.*/, (req, res) => {
        if (req.url.includes('/ver.php')) return;

        // 🛡️ Session Expire නොවී තිබීමට Host එක හරියටම තෝරමු
        let host = TARGET_HOST;
        if (req.url.includes('Account') || req.url.includes('GetLoginData') || req.url.includes('GetAccountBriefInfo')) {
            host = 'clientbp.ggpolarbear.com';
        }

        console.log(`📡 [PROXY] ${req.method} ${host}${req.url}`);

        const options = {
            hostname: host,
            port: 443,
            path: req.url,
            method: req.method,
            headers: { 
                ...req.headers, 
                'host': host,
                'accept-encoding': 'identity' // Compression නිසා දත්ත කියවන්න බැරි වෙන එක නවත්වන්න
            }
        };

        const proxyReq = https.request(options, (proxyRes) => {
            let resChunks = [];
            proxyRes.on('data', chunk => resChunks.push(chunk));
            proxyRes.on('end', () => {
                let buffer = Buffer.concat(resChunks);

                // 🔥 MajorLogin Interception (Redirecting)
                if (req.url.includes('/MajorLogin') && proxyRes.statusCode === 200) {
                    try {
                        let decoded = LoginRes.decode(buffer);
                        console.log(`🔑 Token Captured: ${decoded.token.substring(0, 10)}...`);

                        // Bypass Logic: IP වෙනස් කරන්නේ නැතුව Server URL එක විතරක් හරවනවා
                        decoded.server_url = `https://${MY_DOMAIN}`; 
                        decoded.ip_city = `${MY_IP}:${TCP_PORT}`;

                        buffer = LoginRes.encode(LoginRes.create(decoded)).finish();
                        console.log(`🚀 [REDIRECTED] Game hooked to VPS successfully.`);
                    } catch (e) {
                        console.log(`❌ MajorLogin Error: ${e.message}`);
                    }
                }

                // 🔥 Account Data Interception (Modding Nickname/Level)
                if (req.url.includes('GetAccountBriefInfo') && proxyRes.statusCode === 200) {
                    try {
                        let decoded = AccountBriefRes.decode(buffer);
                        console.log(`👤 Original Nickname: ${decoded.nickname}`);

                        // දත්ත වෙනස් කරනවා
                        decoded.nickname = "MODDED_BY_NAVI";
                        decoded.level = 99;

                        buffer = AccountBriefRes.encode(AccountBriefRes.create(decoded)).finish();
                        console.log(`💎 [MODDED] Profile data injected!`);
                    } catch (e) {
                        console.log(`❌ BriefInfo Error: ${e.message}`);
                    }
                }

                // Headers ටික ආපසු යවනවා (Session Fix සඳහා)
                Object.keys(proxyRes.headers).forEach(k => {
                    if (k !== 'content-length') res.setHeader(k, proxyRes.headers[k]);
                });
                res.status(proxyRes.statusCode).send(buffer);
            });
        });

        proxyReq.on('error', (e) => res.status(500).send(""));
        if (req.rawBody) proxyReq.write(req.rawBody);
        proxyReq.end();
    });
};
