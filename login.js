const https = require('https');
const http = require('http');
const fs = require('fs');
const net = require('net');
const url = require('url');

// Astute server details (from verAddr)
const ASTUTE_CONFIG = {
    verHost: 'version.astutech.online',
    apiHost: 'api.astutech.online',    // උපකල්පනය, actual එක logs වලින් හොයාගන්න
    tcpHost: '103.6.168.170',          // ඔයාගේ පැරණි logs වල තිබුණු IP එක (Astute එකේ TCP server)
    tcpPort: 7006
};

const LOG_DIR = './astute_capture_logs';
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR);

// HTTP Proxy function (to be used in express)
module.exports = function(app) {
    // Capture all HTTP/HTTPS requests
    app.all('*', (req, res) => {
        // Skip ver.php (your own)
        if (req.url === '/ver.php') return;
        
        console.log(`\n🔍 [ASTUTE] ${req.method} ${req.url}`);
        
        // Log request headers
        const reqHeaders = {};
        for (let i = 0; i < req.rawHeaders.length; i += 2) {
            reqHeaders[req.rawHeaders[i]] = req.rawHeaders[i+1];
        }
        const logEntry = {
            timestamp: new Date().toISOString(),
            method: req.method,
            url: req.url,
            headers: reqHeaders,
            body: req.rawBody ? req.rawBody.toString('base64') : null
        };
        fs.writeFileSync(`${LOG_DIR}/req_${Date.now()}.json`, JSON.stringify(logEntry, null, 2));
        
        // Determine target host
        let targetHost = ASTUTE_CONFIG.verHost;
        if (req.url.includes('/GetLoginData') || req.url.includes('/Account') || req.url.includes('/api/')) {
            targetHost = ASTUTE_CONFIG.apiHost;
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
            let chunks = [];
            proxyRes.on('data', c => chunks.push(c));
            proxyRes.on('end', () => {
                const buffer = Buffer.concat(chunks);
                const responseText = buffer.toString('utf8');
                
                console.log(`📤 Response status: ${proxyRes.statusCode}`);
                console.log(`📄 Preview: ${responseText.substring(0, 400)}`);
                
                // Save response
                const respLog = {
                    timestamp: new Date().toISOString(),
                    statusCode: proxyRes.statusCode,
                    headers: proxyRes.headers,
                    bodyBase64: buffer.toString('base64'),
                    bodyText: responseText.substring(0, 2000) // save preview
                };
                fs.writeFileSync(`${LOG_DIR}/resp_${Date.now()}.json`, JSON.stringify(respLog, null, 2));
                
                // Search for tokens
                const tokenPatterns = [
                    /Bearer\s+([A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+)/gi,
                    /"token"\s*:\s*"([^"]+)"/gi,
                    /"access_token"\s*:\s*"([^"]+)"/gi,
                    /"authorization"\s*:\s*"([^"]+)"/gi,
                    /[A-Za-z0-9\-_=]{20,}\.[A-Za-z0-9\-_=]{20,}\.[A-Za-z0-9\-_=]{20,}/g
                ];
                tokenPatterns.forEach(pattern => {
                    const matches = responseText.match(pattern);
                    if (matches) {
                        console.log(`🔥 TOKEN FOUND: ${matches[0]}`);
                        fs.appendFileSync(`${LOG_DIR}/tokens_found.txt`, `${new Date().toISOString()}: ${matches[0]}\n`);
                    }
                });
                
                // Forward response to client
                Object.keys(proxyRes.headers).forEach(k => res.setHeader(k, proxyRes.headers[k]));
                res.status(proxyRes.statusCode).send(buffer);
            });
        });
        
        proxyReq.on('error', (err) => {
            console.error(`Proxy error: ${err.message}`);
            res.status(500).send('');
        });
        if (req.rawBody) proxyReq.write(req.rawBody);
        proxyReq.end();
    });
};

// TCP packet capture (for game server communication)
const tcpProxy = net.createServer((clientSocket) => {
    const clientAddr = clientSocket.remoteAddress;
    console.log(`🔥 [TCP] Client connected from ${clientAddr}`);
    
    // Connect to Astute's real game server (need to discover IP from MajorLogin response)
    // For now, use the IP from your earlier logs or from config
    const targetIP = ASTUTE_CONFIG.tcpHost;
    const targetPort = ASTUTE_CONFIG.tcpPort;
    
    const serverSocket = net.createConnection(targetPort, targetIP, () => {
        console.log(`✅ Connected to Astute TCP server at ${targetIP}:${targetPort}`);
    });
    
    const timestamp = Date.now();
    const clientLog = fs.createWriteStream(`${LOG_DIR}/tcp_client_${timestamp}.raw`);
    const serverLog = fs.createWriteStream(`${LOG_DIR}/tcp_server_${timestamp}.raw`);
    
    clientSocket.on('data', (data) => {
        console.log(`📤 Client -> Server: ${data.length} bytes`);
        clientLog.write(data);
        serverSocket.write(data);
    });
    
    serverSocket.on('data', (data) => {
        console.log(`📥 Server -> Client: ${data.length} bytes`);
        serverLog.write(data);
        clientSocket.write(data);
    });
    
    clientSocket.on('close', () => {
        console.log(`❌ Client disconnected`);
        clientLog.end();
        serverLog.end();
    });
    serverSocket.on('close', () => console.log(`❌ Server disconnected`));
    clientSocket.on('error', (err) => console.error(`Client error: ${err.message}`));
    serverSocket.on('error', (err) => console.error(`Server error: ${err.message}`));
});

// Start TCP proxy only if this script is run directly (not as module)
if (require.main === module) {
    tcpProxy.listen(7006, '0.0.0.0', () => {
        console.log(`✅ TCP capture proxy listening on port 7006`);
    });
    console.log(`🚀 Astute capture tool ready. Make sure to load this as routes.js in your index.js`);
}
