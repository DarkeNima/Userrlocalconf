const express = require('express');
const app = express();

const MY_URL = "https://packing-rolling-declare-suites.trycloudflare.com"; 
const MY_IP = "139.162.54.41";
const PORT = 80;

app.disable('etag');
app.disable('x-powered-by');

app.get('/ver.php', (req, res) => {
    console.log(`[VER] Request from: ${req.ip}`);

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
        "gamevar": "var_name,comment,var_type,var_value\nANODisabledRegions,string,\"IND,NA\"\n",
        "device_whitelist_version": "1.5.0",
        "whitelist_mask": 0,
        "device_whitelist_sp_version": "1.0.0",
        "whitelist_sp_mask": 0,
        "ggp_url": "gin.freefiremobile.com",
        "remote_option_version": "optionallocres:49|optionalavatarres:757|optionalclothres:1184|optionalpetres:871", 
        "remote_option_version_astc": "optionallocres:49|optionalavatarres:719|optionalclothres:1184|optionalpetres:871"
    };

    const jsonResponse = JSON.stringify(responseData).replace(/\//g, '\\/');

    res.set({
        'Content-Type': 'application/json; charset=utf-8',
        'Server': 'cloudflare',
        'Access-Control-Allow-Origin': '*'
    });

    res.status(200).send(jsonResponse);
    console.log(`[VER] Sent Corrected Response to ${req.ip}`);
});

// ✅ Error-Free Routes
app.all('/notice', (req, res) => res.status(200).send("OK"));
app.use('/cdn', (req, res) => res.status(200).send("OK"));
app.use('/common', (req, res) => res.status(200).send("OK"));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 API SERVER RUNNING ON PORT ${PORT}`);
});
