const express = require('express');
const router = express.Router();
const https = require('https');
const protobuf = require('protobufjs');
const config = require('./config');

// 1. Protobuf Schema definition
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

// ✅ මෙන්න මේකයි කලින් අමතක වුණේ:
const LoginResponseMsg = root.lookupType("MajorLoginResponse");

// 2. Forwarding Function

function forwardToGarena(path, req, res) {
    // ගේම් එකෙන් ආපු ඔක්කොම headers කොපි කරමු
    const proxyHeaders = { ...req.headers };
    
    // හැබැයි Host එක අනිවාර්යයෙන්ම ගරීනා එකට වෙනස් වෙන්න ඕනේ
    proxyHeaders['host'] = config.TARGET_HOST;
    
    // Gzip ප්‍රශ්න නැති කරගන්න මේක අයින් කරමු
    delete proxyHeaders['accept-encoding'];
    
    // Content-Length එක අපි අතින් දාන එක නතර කරලා request එකටම හදන්න දෙමු
    delete proxyHeaders['content-length']; 

    const options = {
        hostname: config.TARGET_HOST,
        port: 443,
        path: path,
        method: 'POST',
        headers: proxyHeaders
    };

    const proxyReq = https.request(options, (proxyRes) => {
        let resChunks = [];
        proxyRes.on('data', chunk => resChunks.push(chunk));
        proxyRes.on('end', () => {
            const buffer = Buffer.concat(resChunks);
            console.log(`📦 [Data Captured] Path: ${path} | Status: ${proxyRes.statusCode} | Size: ${buffer.length} bytes`);
            
            if (path === '/GetLoginData' && buffer.length > 0) {
                console.log(`🔍 [Raw Hex Response]: ${buffer.toString('hex')}`);
            }

            // ගරීනා එකෙන් එවන Status Code එකම ගේම් එකට යවමු (උදා: 200, 403, 503)
            res.status(proxyRes.statusCode);
            res.set(proxyRes.headers);
            res.send(buffer);
        });
    });

    proxyReq.on('error', (err) => {
        console.error(`❌ Forwarding Error (${path}):`, err.message);
        res.status(500).send("Proxy Error");
    });

    if (req.rawBody && req.rawBody.length > 0) {
        proxyReq.write(req.rawBody);
    }
    proxyReq.end();
}

// 3. [MajorLogin]
router.post('/MajorLogin', (req, res) => {
    console.log(`\n🎯 [MajorLogin] Captured!`);
    const options = {
        hostname: config.TARGET_HOST,
        port: 443,
        path: '/MajorLogin',
        method: 'POST',
        headers: { ...req.headers, 'host': config.TARGET_HOST, 'content-length': req.rawBody.length }
    };

    const proxyReq = https.request(options, (proxyRes) => {
        const resChunks = [];
        proxyRes.on('data', chunk => resChunks.push(chunk));
        proxyRes.on('end', () => {
            const originalBuffer = Buffer.concat(resChunks);
            try {
                const decoded = LoginResponseMsg.decode(originalBuffer);
                const NEW_SERVER_LIST = `${config.MY_IP}:${config.TCP_PORT}`;

                decoded.field16 = NEW_SERVER_LIST;
                decoded.field24 = NEW_SERVER_LIST;
                decoded.field10 = config.MY_URL_HTTPS;

                if (decoded.field22) {
                    let s = decoded.field22.toString();
                    s = s.replace(/csoversea\.stronghold\.freefiremobile\.com/g, config.MY_IP);
                    s = s.replace(/\b34\.\d+\.\d+\.\d+\b/g, config.MY_IP);
                    decoded.field22 = Buffer.from(s);
                }
                
                if (decoded.field23) {
                    let s2 = decoded.field23.toString();
                    s2 = s2.replace(/csoversea\.stronghold\.freefiremobile\.com/g, config.MY_IP);
                    s2 = s2.replace(/\b34\.\d+\.\d+\.\d+\b/g, config.MY_IP);
                    decoded.field23 = Buffer.from(s2);
                }

                res.send(LoginResponseMsg.encode(LoginResponseMsg.create(decoded)).finish());
                console.log("✅ Injection Successful");
            } catch (err) {
                console.error("❌ Decode failed:", err.message);
                res.send(originalBuffer);
            }
        });
    });
    proxyReq.write(req.rawBody);
    proxyReq.end();
});

// 4. Other Routes
router.post('/GetLoginData', (req, res) => {
    console.log(`📡 [Proxying] /GetLoginData -> Garena`);
    forwardToGarena('/GetLoginData', req, res);
});

router.post('/GenerateNickname', (req, res) => {
    console.log(`📡 [Proxying] /GenerateNickname -> Garena`);
    forwardToGarena('/GenerateNickname', req, res);
});

router.post('/MajorRegister', (req, res) => {
    console.log(`📡 [Proxying] /MajorRegister -> Garena`);
    forwardToGarena('/MajorRegister', req, res);
});

router.post('/Ping', (req, res) => { res.status(200).send("OK"); });
router.post('/webhook', (req, res) => { res.status(200).json({ "status": "ok" }); });

module.exports = router;
