const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const httpProxy = require('http-proxy');

const app = express();
const MY_DOMAIN = 'navidu-ff.duckdns.org';
const TARGET_VER_PHP = 'https://version.astutech.online';
const TARGET_API = 'https://srv0010.astutech.online';

// ─────────────────────────────────────────────────────────
// SSL Certificates (Let's Encrypt)
// ─────────────────────────────────────────────────────────
let sslOptions;
try {
    sslOptions = {
        key: fs.readFileSync(`/etc/letsencrypt/live/${MY_DOMAIN}/privkey.pem`),
        cert: fs.readFileSync(`/etc/letsencrypt/live/${MY_DOMAIN}/fullchain.pem`)
    };
    console.log('✅ SSL certificates loaded successfully');
} catch (err) {
    console.error('❌ SSL Load Error:', err.message);
    process.exit(1);
}

// ─────────────────────────────────────────────────────────
// Create a proxy instance that forwards to TARGET_API
// ─────────────────────────────────────────────────────────
const apiProxy = httpProxy.createProxyServer({
    target: TARGET_API,
    changeOrigin: true,       // changes the Host header to match target
    secure: false,            // ignore self‑signed cert on target (if any)
    followRedirects: false,
    // Do NOT buffer the request – stream it directly
    proxyReqOptDecorator: (proxyReqOpts, originalReq) => {
        // Preserve all original headers (http-proxy already does, but we can add logging)
        console.log(`🔄 [PROXY] ${originalReq.method} ${originalReq.url} → ${TARGET_API}${originalReq.url}`);
        console.log(`📋 Forwarding headers:`, JSON.stringify(originalReq.headers, null, 2));
        return proxyReqOpts;
    },
    // Log errors
    proxyResDecorator: (proxyRes, originalReq, originalRes) => {
        console.log(`📡 Target response status: ${proxyRes.statusCode} for ${originalReq.method} ${originalReq.url}`);
        return proxyRes;
    }
});

// Handle proxy errors (don't crash)
apiProxy.on('error', (err, req, res) => {
    console.error(`❌ Proxy error for ${req.method} ${req.url}:`, err.message);
    if (!res.headersSent) {
        res.status(502).send('Proxy error');
    }
});

// ─────────────────────────────────────────────────────────
// 1. /ver.php – rewrite server_url to your HTTPS domain
// ─────────────────────────────────────────────────────────
app.get('/ver.php', async (req, res) => {
    console.log(`🔧 [VER.PHP] Rewriting domains...`);

    // Forward the request to TARGET_VER_PHP manually (we need to modify the response)
    const targetUrl = `${TARGET_VER_PHP}/ver.php?${new URLSearchParams(req.query).toString()}`;
    const requestOptions = {
        method: 'GET',
        headers: { ...req.headers, host: new URL(TARGET_VER_PHP).host },
    };

    const proxyReq = https.request(targetUrl, requestOptions, (proxyRes) => {
        let data = '';
        proxyRes.on('data', chunk => { data += chunk; });
        proxyRes.on('end', () => {
            // Replace domains (keep https://)
            let modified = data.replace(/version\.astutech\.online/g, MY_DOMAIN)
                               .replace(/srv0010\.astutech\.online/g, MY_DOMAIN);
            // However, the client expects https://, so we leave the scheme as is
            res.status(proxyRes.statusCode);
            Object.entries(proxyRes.headers).forEach(([k, v]) => {
                if (k.toLowerCase() !== 'content-length') res.setHeader(k, v);
            });
            res.send(modified);
            console.log(`✅ /ver.php rewritten and sent.`);
        });
    });
    proxyReq.on('error', (err) => {
        console.error(`❌ /ver.php fetch error:`, err.message);
        res.status(502).send('Error fetching ver.php');
    });
    proxyReq.end();
});

// ─────────────────────────────────────────────────────────
// 2. Catch‑all: proxy everything else (MajorLogin, Ping, etc.)
// ─────────────────────────────────────────────────────────
app.use((req, res) => {
    // Skip /ver.php (already handled above)
    if (req.path === '/ver.php') return;

    // Let http-proxy handle the request – it streams raw data perfectly
    apiProxy.web(req, res);
});

// ─────────────────────────────────────────────────────────
// 3. Create HTTP (80) and HTTPS (443) servers
// ─────────────────────────────────────────────────────────
http.createServer(app).listen(80, '0.0.0.0', () => {
    console.log(`🌐 HTTP proxy listening on port 80`);
});

https.createServer(sslOptions, app).listen(443, '0.0.0.0', () => {
    console.log(`🔒 HTTPS proxy listening on port 443`);
});

console.log(`\n🚀 PROXY SERVER FULLY RUNNING on 80 & 443`);
console.log(`🔗 Client will connect to https://${MY_DOMAIN}`);
console.log(`📡 Forwarding all API requests to ${TARGET_API}\n`);
