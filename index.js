const http = require('http');
const url = require('url');

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    console.log(`[${new Date().toLocaleString()}] Official Handshake for: ${parsedUrl.pathname}`);

    if (parsedUrl.pathname === '/ver.php' || parsedUrl.pathname === '/') {
        res.writeHead(200, { 
            'Content-Type': 'application/json',
            'Connection': 'keep-alive' 
        });
        
        const responseData = {
            "code": 2,
            "is_server_open": true,
            "latest_release_version": "", // හිස්ව තියන්න
            "remote_version": "", // හිස්ව තියන්න
            "server_url": "http://139.162.54.41:10001/", // අගට / එක වැදගත්
            "ggp_url": "139.162.54.41", // Port එක නැතුව IP එක විතරක් දීලා බලමු
            "country_code": "IN",
            "cdn_url": "http://client.common.freefiremobile.com/",
            "gamevar": "var_name,comment,var_type,var_value\nvar_name,comment,\"var_type float, int, bool\",var_value\nANODisabledRegions,\u5173\u95edMTP\u7684\u5730\u533a,string,\"IND,NA\"\nANODisabledClientVariant,ANODisabledClientVariant,string,\"ClientUsingVersion_MAX_HPE,ClientUsingVersion_FFI,ClientUsingVersion_MAX|IND,ClientUsingVersion_MAX|NA,ClientUsingVersion_NORMAL|NA\"\nEnableMtpLiteDataRegion,mtp\u8f7b\u7279\u5f81\u5f00\u5173,string,\"BR,EUROPE,ID,ME,US,RU,SAC,SG,TH,TW,VN,PK,ZA,BD\"\nANOEmulatorCheckDisbaledClientVariant,ANOEmulatorCheckDisbaledClientVariant,string,\"ClientUsingVersion_FFI,ClientUsingVersion_MAX,ClientUsingVersion_NORMAL\"\nForceTutorial_ChangeHudABTest,fps\u6d41\u7a0b\u4e2d\u6253\u5f00hud\u9009\u62e9\u754c\u9762\u7684\u6982\u7387,float,-1\n",
            "garena_hint": false,
            "garena_login": false,
            "is_firewall_open": false,
            "device_whitelist_version": "1.5.0",
            "device_whitelist_sp_version": "1.0.0",
            "need_track_hotupdate": true
        };

        res.end(JSON.stringify(responseData));
    } else {
        res.writeHead(404);
        res.end();
    }
});

const PORT = 80;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Version API Matched with Official Structure!`);
});
