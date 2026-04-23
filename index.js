const http = require('http');

const server = http.createServer((req, res) => {
    // ගේම් එකට අවශ්‍ය JSON Response එක ලබා දීම
    res.writeHead(200, { 'Content-Type': 'application/json' });
    
    const responseData = {
      "abhotupdate_cdn_url": "",
      "abhotupdate_check": "",
      "appstore_url": "http://www.freefiremobile.com/",
      "backup_appstore_url": "",
      "backup_cdn_url": "",
      "billboard_bg_url": "",
      "billboard_cdn_url": "",
      "billboard_msg": "",
      "cdn_url": "http://139.162.54.41/", // ඔයාගේ VPS IP එක
      "client_ip": "139.162.54.41",      // ඔයාගේ VPS IP එක
      "code": 2,
      "core_ip_list": [],
      "core_url": "",
      "country_code": "IN",
      "device_whitelist_sp_version": "1.0.0",
      "device_whitelist_version": "1.5.0",
      "force_refresh_restype": "",
      "gamevar": "var_name,comment,var_type,var_value\nvar_name,comment,\"var_type float, int, bool\",var_value\nANODisabledRegions,关闭MTP的地区,string,\"IND,NA\"\nANODisabledClientVariant,ANODisabledClientVariant,string,\"ClientUsingVersion_MAX_HPE,ClientUsingVersion_FFI,ClientUsingVersion_MAX|IND,ClientUsingVersion_MAX|NA,ClientUsingVersion_NORMAL|NA\"\nEnableMtpLiteDataRegion,mtp轻特征开关,string,\"BR,EUROPE,ID,ME,US,RU,SAC,SG,TH,TW,VN,PK,ZA,BD\"\nANOEmulatorCheckDisbaledClientVariant,ANOEmulatorCheckDisbaledClientVariant,string,\"ClientUsingVersion_FFI,ClientUsingVersion_MAX,ClientUsingVersion_NORMAL\"\nForceTutorial_ChangeHudABTest,fps流程中打开hud选择界面的概率,float,-1\n",
      "garena_hint": false,
      "garena_login": false,
      "gdpr_version": 0,
      "ggp_url": "gin.freefireind.in",
      "gop_url": "",
      "img_cdn_url": "",
      "is_firewall_open": false,
      "is_review_server": false,
      "is_server_open": true,
      "latest_release_version": "1.103.1",
      "login_download_optionalpack": "",
      "login_failed_count": 0,
      "max_store": "",
      "max_video": "",
      "max_web": "",
      "min_hint_size": 1,
      "multi_region": "",
      "need_check_ip_list": [],
      "need_track_hotupdate": true,
      "network_log_server": "",
      "patchnote_url": "",
      "remote_option_version": "",
      "remote_option_version_astc": "",
      "remote_version": "1.103.1",
      "server_url": "http://139.162.54.41/", // ඔයාගේ VPS IP එක
      "should_check_ab_load": false,
      "space_required_in_GB": 0,
      "test_url": "",
      "use_background_download": false,
      "use_background_download_lobby": false,
      "use_login_optional_download": false,
      "web_log_server": "",
      "web_url": "",
      "whitelist_mask": 0,
      "whitelist_sp_mask": 0
    };

    res.end(JSON.stringify(responseData));
});

// Port 80 සාමාන්‍යයෙන් HTTP සඳහා භාවිතා වේ
const PORT = 80;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
