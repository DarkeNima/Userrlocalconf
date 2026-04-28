const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

const PORT = 80;
const MY_IP = "139.162.54.41"; // ඔයාගේ VPS IP එක
const MY_URL = `http://navidu-ff.duckdns.org`;
const BINARY_FILE = path.join(__dirname, 'login_success.bin');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.disable('etag');

// 1. Version API - අර "Config 2" Error එක එන්නේ නැති වෙන්න මේක හදලා තියෙන්නේ
app.get('/ver.php', (req, res) => {
    console.log(`\n[!] VER.PHP REQUEST RECEIVED`);
    
    // ඔයා එවපු අලුත්ම Astutech Response එක
    const responseData = {
        "code": 2,
        "use_login_optional_download": false,
        "use_background_download": false,
        "use_background_download_lobby": false,
        "country_code": "SG",
        "client_ip": req.ip.replace('::ffff:', ''),
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
        "gamevar": "var_name,comment,var_type,var_value\nvar_name,comment,\"var_type float, int, bool\",var_value\nANODisabledRegions,string,\"IND,NA\"\nANODisabledClientVariant,string,\"ClientUsingVersion_MAX_HPE,ClientUsingVersion_FFI,ClientUsingVersion_MAX|IND,ClientUsingVersion_MAX|NA,ClientUsingVersion_NORMAL|NA\"\nEnableMtpLiteDataRegion,string,\"BR,EUROPE,ID,ME,US,RU,SAC,SG,TH,TW,VN,PK,ZA,BD\"\nANOEmulatorCheckDisbaledClientVariant,string,\"ClientUsingVersion_FFI,ClientUsingVersion_MAX,ClientUsingVersion_NORMAL\"\nForceTutorial_ChangeHudABTest,float,-1\n",
        "device_whitelist_version": "1.5.0",
        "whitelist_mask": 0,
        "device_whitelist_sp_version": "1.0.0",
        "whitelist_sp_mask": 0,
        "ggp_url": "gin.freefiremobile.com",
        "server_url": `${MY_URL}/`, // ඊළඟට MajorLogin එක මෙහාට එන්න මේක ඕනේ
        "core_url": MY_IP,
        "core_ip_list": [MY_IP, "0.0.0.0"]
    };

    const jsonResponse = JSON.stringify(responseData).replace(/\//g, '\\/');
    res.set({ 'Content-Type': 'application/json; charset=utf-8' });
    res.status(200).send(jsonResponse);
});

// 2. MajorLogin - අර "400 Error" එක එන්නේ නැති වෙන්න මේකෙන් Hijacked Binary එක යවනවා
app.post('/MajorLogin', (req, res) => {
    console.log(`\n🎯 [MAJOR LOGIN] Hijacking with Binary Data...`);
    
    if (fs.existsSync(BINARY_FILE)) {
        const binaryData = fs.readFileSync(BINARY_FILE);
        res.set({
            'Content-Type': 'application/octet-stream',
            'Connection': 'close'
        });
        res.status(200).send(binaryData);
        console.log(`✅ Binary sent! Game should bypass now.`);
    } else {
        console.log("❌ ERROR: login_success.bin file එක නැහැ!");
        res.status(500).send("File Missing");
    }
});

app.post('/Ping', (req, res) => res.status(200).send("OK"));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 PRIVATE SERVER RUNNING ON PORT ${PORT}`);
});
