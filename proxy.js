const express = require('express');
const router = express.Router();
const https = require('https');
const protobuf = require('protobufjs');
const config = require('./config');

// Protobuf Schema
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


// 🌐 General HTTPS Forwarding Function (හැම රික්වෙස්ට් එකක්ම ගරීනා එකට යවන්න)
 
function forwardToGarena(path, req, res) {
    const cleanHeaders = {};
    
    // අවශ්‍ය Headers විතරක් තෝරා ගනිමු
    const allowedHeaders = ['content-type', 'user-agent', 'x-unity-version', 'app-id', 'sdk-version'];
    allowedHeaders.forEach(h => {
        if (req.headers[h]) cleanHeaders[h] = req.headers[h];
    });

    cleanHeaders['host'] = config.TARGET_HOST;
    cleanHeaders['connection'] = 'keep-alive';

    const options = {
        hostname: config.TARGET_HOST,
        port: 443,
        path: path,
        method: 'POST',
        headers: cleanHeaders
    };

    const proxyReq = https.request(options, (proxyRes) => {
        let resChunks = [];
        proxyRes.on('data', chunk => resChunks.push(chunk));
        proxyRes.on('end', () => {
            const buffer = Buffer.concat(resChunks);
            console.log(`📦 [Data Captured] Path: ${path} | Size: ${buffer.length} bytes`);
            
            // ගේම් එකට Response එක යවනවා
            res.status(proxyRes.statusCode);
            res.set(proxyRes.headers);
            res.send(buffer);
        });
    });

    proxyReq.on('error', (err) => {
        console.error(`❌ Forwarding Error (${path}):`, err.message);
        res.status(500).send("Proxy Error");
    });

    // ගේම් එකෙන් ආපු ඔරිජිනල් දත්ත (Body) එකම යවනවා
    if (req.rawBody && req.rawBody.length > 0) {
        proxyReq.write(req.rawBody);
    }
    proxyReq.end();
}



// 1️⃣ [MajorLogin]
router.post('/MajorLogin', (req, res) => {
    console.log(`\n🎯 [MajorLogin] Captured!`);
    const options = {
        hostname: config.TARGET_HOST, port: 443, path: '/MajorLogin', method: 'POST',
        headers: { ...req.headers, 'host': config.TARGET_HOST, 'content-length': req.rawBody.length }
    };

    const proxyReq = https.request(options, (proxyRes) => {
        const resChunks = [];
        proxyRes.on('data', chunk => resChunks.push(chunk));
        proxyRes.on('end', () => {
            const originalBuffer = Buffer.concat(resChunks);
            try {
                const decoded = LoginResponseMsg.decode(originalBuffer);
                
                console.log("🔍 [MajorLogin] Decoded Full Structure:");
                console.log(JSON.stringify(decoded, null, 2));

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

// 2️⃣ [GetLoginData Proxy]
router.post('/GetLoginData', (req, res) => {
    console.log(`📡 [Proxying] /GetLoginData -> Garena`);
    forwardToGarena('/GetLoginData', req, res);
});

// 3️⃣ [GenerateNickname Proxy]
router.post('/GenerateNickname', (req, res) => {
    console.log(`📡 [Proxying] /GenerateNickname -> Garena`);
    forwardToGarena('/GenerateNickname', req, res);
});

// 4️⃣ [MajorRegister Proxy]
router.post('/MajorRegister', (req, res) => {
    console.log(`📡 [Proxying] /MajorRegister -> Garena`);
    forwardToGarena('/MajorRegister', req, res);
});

// Ping & Webhook
router.post('/Ping', (req, res) => { res.status(200).send("OK"); });
router.post('/webhook', (req, res) => { res.status(200).json({ "status": "ok" }); });

module.exports = router;
