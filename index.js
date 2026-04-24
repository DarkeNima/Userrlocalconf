const http = require('http');
const url = require('url');

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    console.log(`[${new Date().toLocaleString()}] Unity Request: ${parsedUrl.pathname}`);

    if (parsedUrl.pathname === '/ver.php' || parsedUrl.pathname === '/') {
        res.writeHead(200, { 
            'Content-Type': 'application/json',
            'Connection': 'keep-alive' 
        });
        
        // DeepSeek දුන්න Official OB53 Structure එක
        const responseData = {
            "code": 2,
            "is_server_open": true,
            "latest_release_version": "1.123.8",
            "remote_version": "1.123.8",
            "force_update": 0, // Update එක නවත්තන ප්‍රධාන switch එක
            "enable_patch": 1,
            "patchnote_url": "http://139.162.54.41/notice",
            "billboard_msg": "",
            "maintain_msg": "",
            "server_url": "http://139.162.54.41:10001",
            "ggp_url": "139.162.54.41:10001",
            "cdn_url": "http://139.162.54.41/cdn",
            "country_code": "SG"
        };

        res.end(JSON.stringify(responseData));
    } else {
        res.writeHead(404);
        res.end();
    }
});

const PORT = 80;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Version API Optimized with DeepSeek Logic on Port ${PORT}`);
});
