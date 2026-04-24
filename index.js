const express = require('express');
const app = express();

app.disable('etag');
app.disable('x-powered-by');

app.get('/ver.php', (req, res) => {
    console.log(`[VER] Request from: ${req.ip}`);

    const responseObj = {
        "code": 0, // ✅ ChatGPT ගේ උපදෙස: මේක අනිවාර්යයෙන් 0 වෙන්න ඕනේ
        "is_server_open": true,
        "latest_release_version": "1.123.8",
        "remote_version": "1.123.8",
        "force_update": 0,
        "enable_patch": 0, 
        "patchnote_url": "https://purpose-articles-clocks-warm.trycloudflare.com/notice",
        "server_url": "https://purpose-articles-clocks-warm.trycloudflare.com/lobby", // ✅ HTTPS only
        "cdn_url": "https://purpose-articles-clocks-warm.trycloudflare.com/cdn",
        "md5": "7e94677df24a33519a49c4cfc85edf41",
        "pkg_md5": "99f1b4b2b23b52e79d16c93a851d1b35",
        "country_code": "SG"
    };

    const jsonString = JSON.stringify(responseObj);

    // ✅ DeepSeek + ChatGPT Strict Headers
    res.set({
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(jsonString, 'utf8'),
        'Content-Encoding': 'identity',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Server': 'Garena/FreeFire'
    });

    res.status(200).send(jsonString);
    console.log(`[VER] Sent response with code: 0`);
});

// අතුරු ලින්ක් ටිකත් ඕන වෙයි
app.all('/notice', (req, res) => res.status(200).send("OK"));
app.all('/cdn', (req, res) => res.status(200).send("OK"));
app.all('/lobby', (req, res) => res.status(200).send("OK"));

app.listen(80, '0.0.0.0', () => {
    console.log("🚀 ALL AI COMBINED ENGINE - Running on Port 80");
});
