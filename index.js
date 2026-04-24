const http = require('http');

const server = http.createServer((req, res) => {
    // ගේම් එකෙන් එන හැම request එකකටම JSON response එකක් යවනවා
    res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Connection': 'close' 
    });
    
    const responseData = {
        "code": 2, // OB53 වල ලොගින් එකට පනින්න මේක '2' වෙන්නම ඕනේ
        "is_server_open": true,
        "latest_release_version": "1.103.1", 
        "remote_version": "1.103.1",
        "server_url": "http://139.162.54.41:10001",
        "ggp_url": "139.162.54.41:10001", // TCP කනෙක්ෂන් එකට මේක වැදගත්
        "country_code": "IN",
        "cdn_url": "http://client.common.freefiremobile.com/",
        "gamevar": "var_name,comment,var_type,var_value\nANOEmulatorCheckDisbaledClientVariant,bypass,string,\"ClientUsingVersion_FFI,ClientUsingVersion_MAX,ClientUsingVersion_NORMAL\"\n",
        "is_firewall_open": false,
        "garena_hint": false,
        "garena_login": false,
        "client_ip": "139.162.54.41" // ඔයාගේ VPS IP එක මෙතනටත් දැම්මා
    };

    console.log(`[${new Date().toLocaleString()}] Version Check Request from Client`);
    res.end(JSON.stringify(responseData));
});

const PORT = 80;

// වැදගත්: VPS එකේ Port 80 රන් කරන්න නම් 'sudo' පාවිච්චි කරන්න වෙනවා
server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Version API (Port 80) is LIVE!`);
    console.log(`🚀 Redirecting Game to TCP Port 10001`);
});
