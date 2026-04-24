const express = require('express');
const app = express();

// Claude's recommendation: Standard Headers for all responses
app.use((req, res, next) => {
    res.header('Server', 'Garena/FreeFire');
    res.header('X-Content-Type-Options', 'nosniff');
    next();
});

app.get('/ver.php', (req, res) => {
    console.log(`[${new Date().toLocaleString()}] Unity Request: /ver.php`);

    const responseData = JSON.stringify({
        "code": 2, 
        "is_server_open": true,
        "latest_release_version": "1.123.8",
        "remote_version": "1.123.8",
        "force_update": 0,
        "enable_patch": 1,
        "patchnote_url": "https://wheat-rna-holds-powerful.trycloudflare.com/notice",
        "billboard_msg": "",
        "maintain_msg": "",
        "server_url": "http://139.162.54.41:10001",
        "ggp_url": "139.162.54.41:10001",
        "cdn_url": "https://wheat-rna-holds-powerful.trycloudflare.com/cdn",
        "md5": "7e94677df24a33519a49c4cfc85edf41",
        "pkg_md5": "99f1b4b2b23b52e79d16c93a851d1b35",
        "country_code": "SG"
    });

    // Claude's specific headers to fix the retry loop
    res.set({
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(responseData),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Connection': 'keep-alive'
    });

    res.status(200).send(responseData);
});

// Secondary Endpoints: These MUST return 200 OK for OB53 to pass
app.all(['/notice', '/cdn'], (req, res) => {
    console.log(`[${new Date().toLocaleString()}] Secondary Check: ${req.path}`);
    res.status(200).send("OK");
});

app.listen(80, '0.0.0.0', () => {
    console.log("🚀 Server running with New URL: https://wheat-rna-holds-powerful.trycloudflare.com");
});
