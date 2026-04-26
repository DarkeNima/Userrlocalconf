const express = require('express');
const axios = require('axios');
const app = express();

const MY_URL = "http://navidu-ff.duckdns.org"; 
const MY_IP = "139.162.54.41"; // නවීදු, උඹේ VPS IP එක
const ASTUTECH_BASE = "https://version.astutech.online";
const PORT = 80;

app.use(express.json());
app.disable('etag');

// ✅ 1. වැඩ කරන ver.php එක (ලෝඩ් වෙන්න අවශ්‍ය කරන ඔක්කොම දත්ත මෙතන තියෙනවා)
app.get('/ver.php', (req, res) => {
    const responseData = {
        "code": 0,
        "is_server_open": true,
        "latest_release_version": "OB53",
        "remote_version": "1.123.8",
        "server_url": `${MY_URL}/`, 
        "core_url": "csoversea.castle.freefiremobile.com",
        "core_ip_list": [MY_IP, "0.0.0.0"],
        "ggp_url": "gin.freefiremobile.com",
        "gamevar": "var_name,comment,var_type,var_value\nANODisabledRegions,string,\"IND,NA\"\n"
    };
    res.set({ 'Content-Type': 'application/json; charset=utf-8' });
    res.status(200).send(JSON.stringify(responseData).replace(/\//g, '\\/'));
});

// ✅ 2. Smart Proxy with Real Headers
app.use(async (req, res, next) => {
    if (req.path === '/ver.php') return next();

    console.log(`🎯 [DETECTED]: ${req.method} ${req.path}`);
    
    try {
        const response = await axios({
            method: req.method,
            url: `${ASTUTECH_BASE}${req.path}`,
            data: req.body,
            headers: { 
                'Host': 'version.astutech.online',
                'User-Agent': 'UnityPlayer/2019.4.40f1 (UnityWebRequest/1.0, libcurl/7.80.0-DEV)',
                'Accept': '*/*',
                'Accept-Encoding': 'identity',
                'Content-Type': 'application/json',
                'X-Unity-Version': '2019.4.40f1'
            },
            timeout: 15000 // තත්පර 15 ක් දෙනවා බලන්න
        });

        console.log(`✅ [ASTUTECH SUCCESS]: Response Sent`);
        res.status(response.status).json(response.data);

    } catch (error) {
        console.log(`⚠️ [FALLBACK]: Proxy failed (${error.message}). Sending static success...`);
        
        // Astutech failure එකකදී ගේම් එක Error නොවී ලොබියට යවන්න මේ JSON එක දෙනවා
        const fallbackResponse = {
            "status": 200,
            "message": "Success",
            "data": {
                "account": req.body.account || "navidu_player",
                "userid": 100001,
                "nickname": "DarkeNima",
                "session_key": "navidu_secret_key",
                "gate_ip": MY_IP,
                "gate_port": 10001 
            }
        };
        res.status(200).json(fallbackResponse);
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SNIFFER & FALLBACK LIVE!`);
});
