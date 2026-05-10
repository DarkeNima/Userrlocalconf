// login.js
const https = require('https');
const MY_IP = '103.6.168.170';
const TCP_PORT = 7006;
const TARGET_HOST = 'loginbp.ggpolarbear.com';

function handleLoginReq(req, res, LoginResponseMsg) {
    console.log(`\n🎯 [MajorLogin] captured by login.js`);

    const options = {
        hostname: TARGET_HOST,
        port: 443,
        path: '/MajorLogin',
        method: 'POST',
        headers: { ...req.headers, 'host': TARGET_HOST, 'content-length': req.rawBody.length }
    };

    const proxyReq = https.request(options, (proxyRes) => {
        const resChunks = [];
        proxyRes.on('data', chunk => resChunks.push(chunk));
        proxyRes.on('end', () => {
            try {
                const originalBuffer = Buffer.concat(resChunks);
                const decoded = LoginResponseMsg.decode(originalBuffer);
                
                // 1. IP Redirect (TCP 7006 වෙත)
                decoded.field16 = `${MY_IP}:${TCP_PORT}`;
                decoded.field24 = `${MY_IP}:${TCP_PORT}`;
                
                // 2. Nickname Inject
                if (decoded.field2) {
                    decoded.field2 = "Naviya-Server";
                }

                // 3. Re-encode full structure
                const modifiedBuffer = LoginResponseMsg.encode(LoginResponseMsg.create(decoded)).finish();
                
                res.setHeader('Content-Type', 'application/octet-stream');
                res.send(modifiedBuffer);
                console.log(`✅ Login Response fully modified and sent`);
            } catch (err) {
                console.error("❌ Login modification failed:", err.message);
                res.status(500).send("Login Proxy Error");
            }
        });
    });

    proxyReq.on('error', (err) => console.log("Proxy Request Error:", err.message));
    proxyReq.write(req.rawBody);
    proxyReq.end();
}

module.exports = { handleLoginReq };
