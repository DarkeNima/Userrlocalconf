const express = require('express');
const axios = require('axios');
const https = require('https');
const http = require('http');
const fs = require('fs');
const app = express();

// SSL Certificates (අනිවාර්යයෙන්ම මේ Paths තියෙන්න ඕනේ)
const sslOptions = {
    key: fs.readFileSync('/etc/letsencrypt/live/navidu-ff.duckdns.org/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/navidu-ff.duckdns.org/fullchain.pem')
};

app.use(express.raw({ type: '*/*', limit: '10mb' }));

const axiosInstance = axios.create({ httpsAgent: new https.Agent({ rejectUnauthorized: false }) });

app.get('/ver.php', async (req, res) => {
    console.log("🛠️ Game is asking for version config...");
    try {
        const response = await axiosInstance.get(`https://version.astutech.online/ver.php?${new URLSearchParams(req.query).toString()}`, {
            headers: { ...req.headers, host: 'version.astutech.online' }
        });
        let data = response.data.replace(/version\.astutech\.online/g, 'navidu-ff.duckdns.org').replace(/srv0010\.astutech\.online/g, 'navidu-ff.duckdns.org');
        res.send(data);
    } catch (e) {
        console.log("❌ Error fetching from Astute:", e.message);
        res.status(502).send('Error');
    }
});

// Proxy everything else
app.use(async (req, res) => {
    try {
        const response = await axiosInstance({
            method: req.method,
            url: `https://srv0010.astutech.online${req.path}`,
            headers: { ...req.headers, host: 'srv0010.astutech.online' },
            data: req.body,
            responseType: 'arraybuffer'
        });
        res.status(response.status).send(response.data);
    } catch (e) { res.status(500).send('Proxy Error'); }
});

http.createServer(app).listen(80, '0.0.0.0');
https.createServer(sslOptions, app).listen(443, '0.0.0.0', () => {
    console.log('🚀 PROXY IS FULLY RUNNING ON 80 & 443');
});
