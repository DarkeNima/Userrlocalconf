const express = require('express');
const compression = require('compression');
const app = express();

app.use(compression());

// හැම Request එකක්ම ලොග් කරලා, ගේම් එකට 200 OK යවන Wildcard Middleware එකක්
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleString()}] Request: ${req.method} ${req.path}`);
    next();
});

app.get('/ver.php', (req, res) => {
    // Client එක ඉල්ලපු 1.123.8 වර්ෂන් එකම දෙමු, එතකොට අප්ඩේට් ඉල්ලන්නේ නැහැ
    const data = {
        "code": 2,
        "is_server_open": true,
        "latest_release_version": "1.123.8", 
        "remote_version": "1.123.8",
        "force_update": 0,
        "enable_patch": 0, // 🔴 මේක 0 කරාම ගේම් එක CDN Check කරන්නේ නැහැ!
        "patchnote_url": "https://purpose-articles-clocks-warm.trycloudflare.com/notice",
        "server_url": "http://139.162.54.41:10001",
        "ggp_url": "139.162.54.41:10001",
        "cdn_url": "https://purpose-articles-clocks-warm.trycloudflare.com/cdn",
        "md5": "7e94677df24a33519a49c4cfc85edf41",
        "pkg_md5": "99f1b4b2b23b52e79d16c93a851d1b35",
        "country_code": "SG",
        "whitelist_version": "1.5.0",
        "whitelist_sp_version": "1.0.0"
    };

    const minifiedJson = JSON.stringify(data);

    res.set({
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'Connection': 'keep-alive',
        'Server': 'Garena/FreeFire'
    });

    res.status(200).send(minifiedJson);
});

// "/", "/favicon.ico", "/cdn", හෝ වෙන ඕනෑම එකකට Error නොදී OK යවමු
app.all('*', (req, res) => {
    res.status(200).send("OK");
});

app.listen(80, '0.0.0.0', () => {
    console.log("🚀 FINAL FIX API IS RUNNING...");
});
