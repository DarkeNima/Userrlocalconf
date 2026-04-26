const express = require('express');
const axios = require('axios');
const app = express();

const MY_URL = "http://navidu-ff.duckdns.org"; 
const MY_IP = "139.162.54.41";
const ASTUTECH_BASE = "https://version.astutech.online";
const PORT = 80;

app.use(express.json());

// ✅ 1. Astutech ලගේ Original JSON එක (මේක නැතිව ලෝඩ් වෙන්නේ නැහැ)
const astuteData = {
    "code": 0,
    "is_server_open": true,
    "latest_release_version": "OB53",
    "remote_version": "1.123.8",
    "server_url": `${MY_URL}`, 
    "use_login_optional_download": false,
    "use_background_download": false,
    "use_background_download_lobby": false,
    "country_code": "SG",
    "client_ip": "15.235.211.216",
    "gdpr_version": 0,
    "billboard_cdn_url": "",
    "billboard_msg": "",
    "web_url": "",
    "billboard_bg_url": "",
    "max_store": "",
    "max_web": "",
    "max_video": "",
    "patchnote_url": "",
    "multi_region": "",
    "appstore_url": "http://www.freefiremobile.com/",
    "backup_appstore_url": "",
    "garena_login": false,
    "garena_hint": false,
    "gop_url": "",
    "gamevar": "var_name,comment,var_type,var_value\nvar_name,comment,\"var_type float, int, bool\",var_value\nANODisabledRegions,关闭MTP的地区,string,\"IND,NA\"\nANODisabledClientVariant,ANODisabledClientVariant,string,\"ClientUsingVersion_MAX_HPE,ClientUsingVersion_FFI,ClientUsingVersion_MAX|IND,ClientUsingVersion_MAX|NA,ClientUsingVersion_NORMAL|NA\"\nEnableMtpLiteDataRegion,mtp轻特征开关,string,\"BR,EUROPE,ID,ME,US,RU,SAC,SG,TH,TW,VN,PK,ZA,BD\"\nANOEmulatorCheckDisbaledClientVariant,ANOEmulatorCheckDisbaledClientVariant,string,\"ClientUsingVersion_FFI,ClientUsingVersion_MAX,ClientUsingVersion_NORMAL\"\nForceTutorial_ChangeHudABTest,fps流程中打开hud选择界面的概率,float,-1\n",
    "device_whitelist_version": "1.5.0",
    "whitelist_mask": 0,
    "device_whitelist_sp_version": "1.0.0",
    "whitelist_sp_mask": 0,
    "ggp_url": "gin.freefiremobile.com"
};

// ✅ 2. ver.php Route
app.get('/ver.php', (req, res) => {
    console.log(`[VER] Sending Cloned Data to: ${req.ip}`);
    const jsonResponse = JSON.stringify(astuteData).replace(/\//g, '\\/');
    res.set({ 'Content-Type': 'application/json; charset=utf-8' });
    res.status(200).send(jsonResponse);
});

// ✅ 3. Proxy Middleware (Regex නැතුව ලේසි ක්‍රමයට)
app.use(async (req, res, next) => {
    if (req.path === '/ver.php') return next();

    console.log(`🎯 [DETECTED]: ${req.method} ${req.path}`);
    
    let cleanPath = req.path;
    if (cleanPath.startsWith('//')) cleanPath = cleanPath.substring(1);
    
    try {
        const response = await axios({
            method: req.method,
            url: `${ASTUTECH_BASE}${cleanPath}`,
            data: req.body,
            headers: { 
                ...req.headers, 
                'host': 'version.astutech.online' 
            }
        });

        console.log(`✅ [ASTUTECH]:`, JSON.stringify(response.data));
        res.status(response.status).json(response.data);
    } catch (error) {
        console.log(`❌ [FAILED]: ${error.message}`);
        res.status(200).send("OK");
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 FINAL FIX LIVE ON PORT ${PORT}`);
});
