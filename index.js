const express = require('express');
const axios = require('axios');
const app = express();

const MY_URL = "http://navidu-ff.duckdns.org"; 
const MY_IP = "139.162.54.41";
const ASTUTECH_BASE = "https://version.astutech.online";
const PORT = 80;

app.use(express.json());

// ✅ 1. Astutech එකේ දත්තම ගේම් එකට දෙන ver.php එක
app.get('/ver.php', (req, res) => {
    console.log(`[VER] Cloning Astutech data for: ${req.ip}`);

    const responseData = {
        "code": 0,
        "is_server_open": true,
        "latest_release_version": "OB53",
        "remote_version": "1.123.8",
        "server_url": `${MY_URL}`, // ගේම් එක අපේ VPS එකටම ගෙන්න ගන්නවා
        "use_login_optional_download": false,
        "use_background_download": false,
        "use_background_download_lobby": false,
        "country_code": "SG",
        "client_ip": req.ip.replace('::ffff:', ''),
        "core_url": "csoversea.castle.freefiremobile.com",
        "core_ip_list": [MY_IP, "0.0.0.0"],
        "ggp_url": "gin.freefiremobile.com",
        "gamevar": "var_name,comment,var_type,var_value\nANODisabledRegions,string,\"IND,NA\"\nANODisabledClientVariant,string,\"ClientUsingVersion_MAX_HPE,ClientUsingVersion_FFI,ClientUsingVersion_MAX|IND,ClientUsingVersion_MAX|NA,ClientUsingVersion_NORMAL|NA\"\n"
    };

    const jsonResponse = JSON.stringify(responseData).replace(/\//g, '\\/');
    res.set({ 'Content-Type': 'application/json; charset=utf-8' });
    res.status(200).send(jsonResponse);
});

// ✅ 2. Proxy Middleware - නිකේම් එක ගැහුවම Astutech එකට යන පාර
app.use(async (req, res, next) => {
    if (req.path === '/ver.php') return next();

    // පාරවල් වල / ප්‍රශ්නය විසඳීම
    let cleanPath = req.path;
    if (cleanPath.startsWith('//')) cleanPath = cleanPath.substring(1);
    
    const targetUrl = `${ASTUTECH_BASE}${cleanPath}`;
    console.log(`📡 [REDIRECTING TO ASTUTECH]: ${targetUrl}`);

    try {
        const response = await axios({
            method: req.method,
            url: targetUrl,
            data: req.body,
            headers: {
                ...req.headers,
                'host': 'version.astutech.online'
            }
        });

        console.log(`✅ [SUCCESS FROM ASTUTECH]:`, JSON.stringify(response.data));
        res.status(response.status).json(response.data);

    } catch (error) {
        console.log(`❌ [FAILED]: ${error.message}`);
        // Astutech එක වැඩ නැත්නම් ගේම් එක ලොබියට යවන්න ට්‍රයි කරමු
        res.status(200).json({ "status": 200, "data": { "gate_ip": MY_IP, "gate_port": 10001 } });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 CLONED SERVER RUNNING!`);
});
