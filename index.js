const express = require('express');
const axios = require('axios');
const app = express();

const MY_URL = "http://navidu-ff.duckdns.org"; 
const MY_IP = "139.162.54.41";
const ASTUTECH_BASE = "https://version.astutech.online";
const PORT = 80;

app.use(express.json());

// ✅ 1. පාරවල් අල්ලන කෑල්ල (Logger)
app.use((req, res, next) => {
    if (req.path === '/ver.php') return next();
    console.log(`🎯 [DETECTED]: ${req.method} ${req.path}`);
    next();
});

// ✅ 2. FIX කරපු ver.php (මේකෙන් තමයි ගේම් එක ලෝඩ් කරවන්නේ)
app.get('/ver.php', (req, res) => {
    console.log(`[VER] Fixing Loading Screen for: ${req.ip}`);

    const responseData = {
        "code": 0, // මේක 0 වෙන්නම ඕනේ
        "is_server_open": true,
        "is_firewall_open": false,
        "cdn_url": "https://dl.cdn.freefiremobile.com/live/ABHotUpdates/",
        "backup_cdn_url": "https://dl.cdn.freefiremobile.com/live/ABHotUpdates/",
        "abhotupdate_cdn_url": "https://dl-core.cdn.freefiremobile.com/live/ABHotUpdates/",
        "img_cdn_url": "https://dl.cdn.freefiremobile.com/common/",
        "latest_release_version": "OB53",
        "remote_version": "1.123.8",
        "server_url": `${MY_URL}/`, 
        "country_code": "SG",
        "client_ip": req.ip.replace('::ffff:', ''),
        "core_url": "csoversea.castle.freefiremobile.com",
        "core_ip_list": [MY_IP, "0.0.0.0"],
        "ggp_url": "gin.freefiremobile.com",
        "use_login_optional_download": true,
        "gamevar": "var_name,comment,var_type,var_value\nANODisabledRegions,string,\"IND,NA\"\n"
    };

    const jsonResponse = JSON.stringify(responseData).replace(/\//g, '\\/');
    res.set({ 'Content-Type': 'application/json; charset=utf-8' });
    res.status(200).send(jsonResponse);
});

// ✅ 3. ලොගින් එක Proxy කරමු
app.all('(.*)', async (req, res) => {
    try {
        const response = await axios({
            method: req.method,
            url: `${ASTUTECH_BASE}${req.path}`,
            data: req.body,
            headers: { 'Content-Type': 'application/json' }
        });
        res.status(response.status).json(response.data);
    } catch (error) {
        res.status(200).send("OK");
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 LOADING FIXED! RUNNING ON PORT ${PORT}`);
});
