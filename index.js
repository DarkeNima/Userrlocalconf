const http = require('http');

const server = http.createServer((req, res) => {
    // 📝 මෙන්න මෙතනින් තමයි ගේම් එක අපෙන් ඉල්ලන දේ ලොග් වෙන්නේ
    console.log(`\n[${new Date().toLocaleString()}] --- Incoming Request ---`);
    console.log(`Method: ${req.method}`);
    console.log(`URL: ${req.url}`);
    console.log(`Headers:`, req.headers);

    res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Connection': 'close' 
    });
    
    const responseData = {
        "code": 2,
        "is_server_open": true,
        "latest_release_version": "1.103.1", 
        "remote_version": "1.103.1",
        "server_url": "http://139.162.54.41:10001",
        "ggp_url": "139.162.54.41:10001",
        "country_code": "IN",
        "cdn_url": "http://client.common.freefiremobile.com/",
        "gamevar": "var_name,comment,var_type,var_value\nANOEmulatorCheckDisbaledClientVariant,bypass,string,\"ClientUsingVersion_FFI,ClientUsingVersion_MAX,ClientUsingVersion_NORMAL\"\n",
        "is_firewall_open": false,
        "garena_hint": false,
        "garena_login": false,
        "client_ip": "139.162.54.41"
    };

    res.end(JSON.stringify(responseData));
});

const PORT = 80;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`👀 Version API Debugger is watching on Port ${PORT}`);
});
