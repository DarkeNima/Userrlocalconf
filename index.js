const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const net = require('net');
const config = require('./config');

const app = express();

// SSL Certificates
let sslOptions;
try {
    sslOptions = {
        key: fs.readFileSync(`/etc/letsencrypt/live/${config.MY_DOMAIN}/privkey.pem`),
        cert: fs.readFileSync(`/etc/letsencrypt/live/${config.MY_DOMAIN}/fullchain.pem`)
    };
    console.log('✅ SSL Certificates loaded');
} catch (err) {
    console.error('❌ SSL Error:', err.message);
    process.exit(1);
}

// Raw Body Capture Middleware (අනිවාර්යයි)
app.use((req, res, next) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => { req.rawBody = Buffer.concat(chunks); next(); });
});

// 🔗 අපේ අලුත් Routes ටික සම්බන්ධ කිරීම
const verRoutes = require('./ver');
const proxyRoutes = require('./proxy');

app.use('/', verRoutes);
app.use('/', proxyRoutes);

// Catch-all Logging
app.use((req, res, next) => { 
    console.log(`📡 [Incoming] ${req.method} ${req.url}`); 
    next(); 
});

// 🔥 TCP Server
const tcpServer = net.createServer((socket) => {
    console.log(`\n🔥 [TCP] Client Connected: ${socket.remoteAddress}`);
    socket.on('data', (data) => console.log(`[TCP] Received: ${data.length} bytes`));
});
tcpServer.listen(config.TCP_PORT, '0.0.0.0');

// සර්වර් Start කිරීම
http.createServer(app).listen(config.HTTP_PORT, () => {
    console.log(`🌐 HTTP Server running on port ${config.HTTP_PORT}`);
});
https.createServer(sslOptions, app).listen(config.HTTPS_PORT, () => {
    console.log(`🔒 HTTPS Server running on port ${config.HTTPS_PORT}`);
});
