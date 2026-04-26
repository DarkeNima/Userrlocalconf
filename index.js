const express = require('express');
const axios = require('axios');
const app = express();

const MY_URL = "http://navidu-ff.duckdns.org"; 
const MY_IP = "139.162.54.41";
const ASTUTECH_BASE = "https://version.astutech.online";
const PORT = 80;

app.use(express.json());
app.disable('etag');
app.disable('x-powered-by');

// Middleware for logging
app.use((req, res, next) => {
    if (req.path === '/ver.php') return next();
    console.log(`🎯 [DETECTED]: ${req.method} ${req.path}`);
    if (req.body && Object.keys(req.body).length > 0) {
        console.log(`📦 Body:`, JSON.stringify(req.body));
    }
    next();
});

// ver.php Route
app.get('/ver.php', (req, res) => {
    console.log(`[VER] Request from: ${req.ip}`);
    const responseData = {
        "code": 0,
        "is_server_open": true,
        "latest_release_version": "OB53",
        "remote_version": "1.123.8",
        "server_url": `${MY_URL}/`, 
        "country_code": "SG",
        "client_ip": req.ip.replace('::ffff:', ''),
        "core_url": "csoversea.castle.freefiremobile.com",
        "core_ip_list": [MY_IP, "0.0.0.0"], 
        "ggp_url": "gin.freefiremobile.com"
    };
    const jsonResponse = JSON.stringify(responseData).replace(/\//g, '\\/');
    res.set({ 'Content-Type': 'application/json; charset=utf-8' });
    res.status(200).send(jsonResponse);
});

// Proxy logic - Fixed wildcard for Express 5
app.all('(.*)', async (req, res) => {
    if (req.path === '/ver.php') return;

    try {
        console.log(`🔄 [PROXYING] to Astutech: ${req.path}`);
        const response = await axios({
            method: req.method,
            url: `${ASTUTECH_BASE}${req.path}`,
            data: req.body,
            headers: { 'Content-Type': 'application/json' }
        });

        console.log(`✅ [ASTUTECH RESPONSE] for ${req.path}:`, JSON.stringify(response.data));
        res.status(response.status).json(response.data);
    } catch (error) {
        console.log(`❌ [ERROR] Proxy failed for ${req.path}: ${error.message}`);
        res.status(200).send("OK");
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SNIFFER/PROXY SERVER RUNNING ON PORT ${PORT}`);
});
