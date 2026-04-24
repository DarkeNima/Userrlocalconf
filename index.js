const http = require('http');
const url = require('url');

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    console.log(`[${new Date().toLocaleString()}] Request for: ${parsedUrl.pathname}`);

    // ගේම් එක ඉල්ලන path එක ver.php වුණත්, සාමාන්‍ය එක වුණත් මේ JSON එකම දෙනවා
    if (parsedUrl.pathname === '/ver.php' || parsedUrl.pathname === '/') {
        res.writeHead(200, { 
            'Content-Type': 'application/json',
            'Connection': 'close' 
        });
        
        const responseData = {
            "code": 2,
            "is_server_open": true,
            "latest_release_version": "1.123.8", // ලොග්ස් වල තිබ්බ වර්ෂන් එකම දුන්නා
            "remote_version": "1.123.8",
            "server_url": "http://139.162.54.41:10001",
            "ggp_url": "139.162.54.41:10001",
            "country_code": "SG", // ලොග්ස් වල තිබ්බ විදිහට SG කළා
            "cdn_url": "http://client.common.freefiremobile.com/",
            "gamevar": "var_name,comment,var_type,var_value\nANOEmulatorCheckDisbaledClientVariant,bypass,string,\"ClientUsingVersion_FFI,ClientUsingVersion_MAX,ClientUsingVersion_NORMAL\"\n",
            "is_firewall_open": false,
            "garena_hint": false,
            "garena_login": false
        };

        res.end(JSON.stringify(responseData));
    } else {
        res.writeHead(404);
        res.end();
    }
});

const PORT = 80;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Version API Optimized for OB53 (1.123.8) on Port ${PORT}`);
});
