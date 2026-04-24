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
    "code": 2, // OB53 සාර්ථකයි කියලා කියන්න
    "is_server_open": true,
    "latest_release_version": "1.123.8",
    "remote_version": "1.123.8",
    "force_update": 0, // අනිවාර්යයෙන්ම 0 වෙන්න ඕනේ
    "enable_patch": 1,
    "patchnote_url": "https://split-venice-nil-northern.trycloudflare.com/notice",
    "server_url": "http://139.162.54.41:10001", // Lobby එකට IP එකම තියන්න
    "ggp_url": "139.162.54.41:10001",
    "cdn_url": "https://split-venice-nil-northern.trycloudflare.com/cdn",
    "md5": "7e94677df24a33519a49c4cfc85edf41", // Official පෙනුමක් දෙන්න
    "pkg_md5": "99f1b4b2b23b52e79d16c93a851d1b35",
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
