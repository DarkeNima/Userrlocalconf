const express = require('express');
const app = express();

// Request එක ගැන හැම විස්තරයක්ම ලොග් කරන middleware එකක්
app.use((req, res, next) => {
    console.log(`\n[${new Date().toLocaleString()}] --- NEW REQUEST ---`);
    console.log(`Method: ${req.method} | Path: ${req.path}`);
    console.log(`Query: ${JSON.stringify(req.query)}`);
    console.log(`Headers: ${JSON.stringify(req.headers)}`);
    next();
});

app.get('/ver.php', (req, res) => {
    // මේ response එක OB53 වලට ගැලපෙන විදිහට ටිකක් වෙනස් කළා
    const responseData = {
        "code": 2, 
        "is_server_open": true,
        "latest_release_version": "1.123.8",
        "remote_version": "1.123.8",
        "force_update": 0,
        "enable_patch": 1,
        "patchnote_url": "https://wheat-rna-holds-powerful.trycloudflare.com/notice",
        "server_url": "http://139.162.54.41:10001",
        "cdn_url": "https://wheat-rna-holds-powerful.trycloudflare.com/cdn",
        "md5": "7e94677df24a33519a49c4cfc85edf41",
        "pkg_md5": "99f1b4b2b23b52e79d16c93a851d1b35",
        "country_code": "SG"
    };

    const jsonResponse = JSON.stringify(responseData);

    res.set({
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(jsonResponse),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Server': 'Garena/FreeFire', // Official පෙනුමක් දෙන්න
        'Connection': 'keep-alive'
    });

    res.status(200).send(jsonResponse);
    console.log(`[Sent Response]: ${jsonResponse}`);
});

// අතුරු පරීක්ෂාවන් ලොග් කරන්න (CDN සහ Notice)
app.all(['/notice', '/cdn'], (req, res) => {
    res.status(200).send("OK");
});

app.listen(80, '0.0.0.0', () => {
    console.log("🚀 Debug API Running - Watching for details...");
});
