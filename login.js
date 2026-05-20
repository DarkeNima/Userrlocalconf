const express = require('express');
const https = require('https');
const http = require('http');

const app = express();

app.use((req, res, next) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
        req.rawBody = Buffer.concat(chunks);
        console.log(`\n📥 REQUEST → ${req.method} ${req.originalUrl}`);
        if (req.rawBody.length > 0) {
            console.log(`Body Size: ${req.rawBody.length} bytes`);
        }
        next();
    });
});

// MITM Proxy - All requests forward + log
app.use((req, res) => {
    console.log(`🔄 Forwarding to Garena: ${req.originalUrl}`);

    const options = {
        hostname: 'loginbp.ggpolarbear.com',
        port: 443,
        path: req.originalUrl,
        method: req.method,
        headers: { ...req.headers, host: 'loginbp.ggpolarbear.com' }
    };

    const proxyReq = https.request(options, (proxyRes) => {
        let chunks = [];
        proxyRes.on('data', chunk => chunks.push(chunk));
        
        proxyRes.on('end', () => {
            const buffer = Buffer.concat(chunks);
            
            console.log(`📤 RESPONSE ← ${req.originalUrl} | Status: ${proxyRes.statusCode} | Size: ${buffer.length} bytes`);
            console.log("🔍 Hex Preview:", buffer.slice(0, 60).toString('hex'));
            
            res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'application/octet-stream');
            res.status(proxyRes.statusCode || 200).send(buffer);
        });
    });

    proxyReq.on('error', (e) => {
        console.error("❌ Proxy Error:", e.message);
        res.status(502).send("Proxy Error");
    });

    if (req.rawBody) proxyReq.write(req.rawBody);
    proxyReq.end();
});

// Start MITM Proxy
http.createServer(app).listen(8080, '0.0.0.0', () => {
    console.log("🚀 MITM Proxy Running on http://0.0.0.0:8080");
    console.log("Game එකේ Proxy Settings හරහා ඔයාගේ VPS IP + Port 8080 දාන්න");
});
