const express = require('express');
const router = express.Router();
const https = require('https');
const protobuf = require('protobufjs');
const config = require('./config');

// 1. Protobuf Schema (LoginResponse එක විතරක් Decode කරන්න)
const root = protobuf.Root.fromJSON({
    nested: {
        MajorLoginResponse: {
            fields: {
                field1: { type: "uint64", id: 1 },
                field10: { type: "string", id: 10 } // අපිට ඕන URL එක තියෙන්නේ මෙතන
                // අනෙක් fields අවශ්‍ය නැහැ structure එකේ order එක හරිනම්
            }
        }
    }
});

// 🌐 පිරිසිදු Forwarding Function එක
function forwardToGarena(path, req, res, callback = null) {
    const proxyHeaders = { ...req.headers };
    proxyHeaders['host'] = config.TARGET_HOST;
    delete proxyHeaders['accept-encoding'];
    delete proxyHeaders['content-length'];

    if (req.rawBody) proxyHeaders['content-length'] = req.rawBody.length;

    const options = {
        hostname: config.TARGET_HOST,
        port: 443,
        path: path,
        method: 'POST',
        headers: proxyHeaders
    };

    const proxyReq = https.request(options, (proxyRes) => {
        let chunks = [];
        proxyRes.on('data', chunk => chunks.push(chunk));
        proxyRes.on('end', () => {
            const buffer = Buffer.concat(chunks);
            console.log(`📦 [Captured] ${path} | Size: ${buffer.length} bytes`);
            
            if (callback) {
                // දත්ත වෙනස් කරන්න ඕන නම් callback එකෙන් කරමු
                const modifiedBuffer = callback(buffer);
                res.status(proxyRes.statusCode).set(proxyRes.headers).send(modifiedBuffer);
            } else {
                res.status(proxyRes.statusCode).set(proxyRes.headers).send(buffer);
            }
        });
    });

    if (req.rawBody) proxyReq.write(req.rawBody);
    proxyReq.end();
}

// 🎯 1. MajorLogin - මෙතනදී තමයි Traffic එක හරවගන්නේ
router.post('/MajorLogin', (req, res) => {
    console.log(`\n🎯 [MajorLogin] Captured! Redirecting Next Requests...`);
    
    forwardToGarena('/MajorLogin', req, res, (originalBuffer) => {
        try {
            // අපි සම්පූර්ණ දත්ත Decode කරන්නේ නැතුව String එකක් විදිහට අරන්
            // field10 එකේ තියෙන URL එක විතරක් අපේ URL එකට Replace කරමු.
            // මේක ගොඩක් Safe ක්‍රමයක්.
            let dataStr = originalBuffer.toString('binary');
            const garenaUrl = "https://clientbp.ggpolarbear.com";
            
            if (dataStr.includes(garenaUrl)) {
                console.log("🔗 Found Garena URL! Redirecting to Proxy...");
                dataStr = dataStr.replace(garenaUrl, config.MY_URL_HTTPS);
                return Buffer.from(dataStr, 'binary');
            }
        } catch (err) {
            console.error("❌ Redirection Failed:", err.message);
        }
        return originalBuffer;
    });
});

// 🎯 2. GetLoginData - දැන් මේක අපේ සර්වර් එකට අනිවාර්යයෙන්ම එන්න ඕනේ
// 🎯 2. GetLoginData (මේක උඩින් තියෙන්න ඕනේ)
router.post('/GetLoginData', (req, res) => {
    console.log(`📡 [Proxying] /GetLoginData -> Intercepting Diamonds/Gold...`);
    forwardToGarena('/GetLoginData', req, res, (buffer) => {
        console.log(`🔍 [Raw Hex Response]: ${buffer.toString('hex')}`);
        return buffer;
    });
});

// ✅ අනිත් හැම එකක්ම Forward කරන්න (Catch-all)
router.use((req, res) => {
    if (req.method === 'POST') {
        forwardToGarena(req.path, req, res);
    } else {
        res.status(404).send('Not Found');
    }
});
