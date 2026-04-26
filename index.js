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

// ✅ 1. Version Check (ver.php) - මේක මුලින්ම තියෙන්න ඕනේ
app.get('/ver.php', (req, res) => {
    console.log(`[VER] Fixing Loading Screen for: ${req.ip}`);

    const responseData = {
        "code": 0,
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

// ✅ 2. අනිත් හැම Request එකක්ම Astutech එකට Proxy කරන Middleware එක
// මෙතන '*' හෝ '(.*)' පාවිච්චි කරන්නේ නැති නිසා Error එන්නේ නැහැ
app.use(async (req, res) => {
    // ver.php එකට මේක අදාළ නැහැ (ඒක උඩින් ඉවර වෙනවා)
    console.log(`🎯 [DETECTED]: ${req.method} ${req.path}`);
    
    if (req.body && Object.keys(req.body).length > 0) {
        console.log(`📦 Body:`, JSON.stringify(req.body));
    }

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
        console.log(`❌ [ERROR] Proxy failed: ${error.message}`);
        res.status(200).send("OK");
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 LOADING FIXED & SNIFFER LIVE!`);
});
