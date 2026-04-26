const express = require('express');
const axios = require('axios');
const app = express();

const MY_URL = "http://navidu-ff.duckdns.org"; 
const MY_IP = "139.162.54.41"; 
const ASTUTECH_BASE = "https://version.astutech.online";
const PORT = 80;

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // 🛠️ Form data කියවන්න මේක අනිවාර්යයි
app.disable('etag');

// ✅ 1. වැඩ කරන ver.php එක (උඹේ සම්පූර්ණ දත්ත ටිකත් එක්කම)
app.get('/ver.php', (req, res) => {
    const responseData = {
        "code": 0,
        "is_server_open": true,
        "is_firewall_open": false,
        "cdn_url": "https://dl.cdn.freefiremobile.com/live/ABHotUpdates/",
        "backup_cdn_url": "https://dl.cdn.freefiremobile.com/live/ABHotUpdates/",
        "abhotupdate_cdn_url": "https://dl-core.cdn.freefiremobile.com/live/ABHotUpdates/",
        "img_cdn_url": "https://dl.cdn.freefiremobile.com/common/",
        "login_download_optionalpack": "optionalclothres:shaders|optionalpetres:optionalpetres_commonab_shader|optionallobbyres:",
        "need_track_hotupdate": true,
        "abhotupdate_check": "cache_res;assetindexer;SH-Gpp",
        "latest_release_version": "OB53",
        "min_hint_size": 1,
        "space_required_in_GB": 1.48,
        "should_check_ab_load": false,
        "force_refresh_restype": "optionalavatarres",
        "remote_version": "1.123.8",
        "server_url": `${MY_URL}/`, 
        "is_review_server": false,
        "use_login_optional_download": true,
        "use_background_download": false,
        "use_background_download_lobby": false,
        "country_code": "SG",
        "client_ip": req.ip.replace('::ffff:', ''),
        "gdpr_version": 0,
        "billboard_cdn_url": "https://dl.dir.freefiremobile.com/common/OB53/CSH/patchupdate/sghfuHFHf101.ff_extend",
        "billboard_msg": "",
        "web_url": "",
        "billboard_bg_url": "https://dl.cdn.freefiremobile.com/common/OB23/version/Patch_Bg.png",
        "max_store": "",
        "max_web": "",
        "max_video": "",
        "patchnote_url": "https://dl.dir.freefiremobile.com/common/web_event/aswqooiwd/EnlyjW26.html?lang=en",
        "multi_region": "",
        "need_check_ip_list": [],
        "network_log_server": "https://sgnetwork.ggblueshark.com/",
        "web_log_server": "https://networkselftest.ff.garena.com/api/",
        "login_failed_count": 2,
        "test_url": "",
        "core_url": "csoversea.castle.freefiremobile.com",
        "core_ip_list": [MY_IP, "0.0.0.0"], 
        "appstore_url": "http://www.freefiremobile.com/",
        "backup_appstore_url": "",
        "garena_login": false,
        "garena_hint": false,
        "gop_url": "",
        "gamevar": "var_name,comment,var_type,var_value\nANODisabledRegions,string,\"IND,NA\"\nANODisabledClientVariant,string,\"ClientUsingVersion_MAX_HPE,ClientUsingVersion_FFI,ClientUsingVersion_MAX|IND,ClientUsingVersion_MAX|NA,ClientUsingVersion_NORMAL|NA\"\nEnableMtpLiteDataRegion,string,\"BR,EUROPE,ID,ME,US,RU,SAC,SG,TH,TW,VN,PK,ZA,BD\"\n",
        "device_whitelist_version": "1.5.0",
        "whitelist_mask": 0,
        "device_whitelist_sp_version": "1.0.0",
        "whitelist_sp_mask": 0,
        "ggp_url": "gin.freefiremobile.com",
        "remote_option_version": "optionallocres:49|optionalavatarres:757|optionalclothres:1184|optionalpetres:871", 
        "remote_option_version_astc": "optionallocres:49|optionalavatarres:719|optionalclothres:1184|optionalpetres:871"
    };

    res.set({ 'Content-Type': 'application/json; charset=utf-8' });
    res.status(200).send(JSON.stringify(responseData).replace(/\//g, '\\/'));
});

// ✅ 2. Smart Proxy with Crash Protection
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
            timeout: 15000
        });

        console.log(`✅ [ASTUTECH SUCCESS]: Response Sent`);
        res.status(response.status).json(response.data);

    } catch (error) {
        console.log(`⚠️ [FALLBACK]: Proxy failed (${error.message}). Sending static success...`);
        
        // 🛠️ CRASH FIX: account එක තියෙනවද කියලා බලලා ගන්නවා, නැත්නම් නමක් දානවා
        const playerName = (req.body && req.body.account) ? req.body.account : "Navidu_Player";

        const fallbackResponse = {
            "status": 200,
            "message": "Success",
            "data": {
                "account": playerName,
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
    console.log(`🚀 SNIFFER & FALLBACK LIVE WITH FULL DATA!`);
});

// සර්වර් එක මොනම හේතුවකටවත් නතර වෙන්න දෙන්න එපා
process.on('uncaughtException', (err) => {
    console.log('🔥 PREVENTED CRASH:', err.message);
});
