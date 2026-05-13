const https = require('https');
const fs = require('fs');

module.exports = function(app) {
    app.all(/.*/, (req, res) => {
        // Log every incoming request
        console.log(`\n📥 ${req.method} ${req.url}`);
        
        // Log all headers
        console.log('📋 Headers:');
        for (let i = 0; i < req.rawHeaders.length; i += 2) {
            console.log(`   ${req.rawHeaders[i]}: ${req.rawHeaders[i+1]}`);
        }
        
        // Log body if any (for POST)
        let bodyChunks = [];
        req.on('data', chunk => bodyChunks.push(chunk));
        req.on('end', () => {
            const body = Buffer.concat(bodyChunks);
            if (body.length > 0) {
                console.log(`📦 Body (${body.length} bytes): ${body.toString('hex').substring(0, 200)}`);
                req.rawBody = body;
            }
            
            // Determine target host
            let targetHost = 'loginbp.ggpolarbear.com';
            if (req.url.includes('Account') || req.url.includes('GetLoginData')) {
                targetHost = 'clientbp.ggpolarbear.com';
            }
            
            // Build proxy headers
            const proxyHeaders = {};
            for (let i = 0; i < req.rawHeaders.length; i += 2) {
                const key = req.rawHeaders[i];
                const val = req.rawHeaders[i+1];
                if (key.toLowerCase() === 'host') {
                    proxyHeaders[key] = targetHost;
                } else {
                    proxyHeaders[key] = val;
                }
            }
            
            const options = {
                hostname: targetHost,
                port: 443,
                path: req.url,
                method: req.method,
                headers: proxyHeaders,
                rejectUnauthorized: false
            };
            
            const proxyReq = https.request(options, (proxyRes) => {
                let resChunks = [];
                proxyRes.on('data', chunk => resChunks.push(chunk));
                proxyRes.on('end', () => {
                    const buffer = Buffer.concat(resChunks);
                    console.log(`📤 Response status: ${proxyRes.statusCode}`);
                    console.log(`📤 Response headers: ${JSON.stringify(proxyRes.headers)}`);
                    
                    // Save response body to file for inspection
                    const timestamp = Date.now();
                    const filename = `${req.url.replace(/\//g, '_')}_${timestamp}.bin`;
                    fs.writeFileSync(filename, buffer);
                    console.log(`💾 Response saved to: ${filename}`);
                    
                    // If it's GetLoginData, try to parse as text
                    if (req.url.includes('/GetLoginData')) {
                        const text = buffer.toString('utf8');
                        console.log(`📄 Response text preview: ${text.substring(0, 500)}`);
                    }
                    
                    // Forward response to client
                    Object.keys(proxyRes.headers).forEach(k => res.setHeader(k, proxyRes.headers[k]));
                    res.status(proxyRes.statusCode).send(buffer);
                });
            });
            
            proxyReq.on('error', (err) => {
                console.error(`❌ Proxy error: ${err.message}`);
                res.status(500).send('');
            });
            
            if (req.rawBody) proxyReq.write(req.rawBody);
            proxyReq.end();
        });
    });
};
