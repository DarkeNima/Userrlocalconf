const express = require('express');
const compression = require('compression'); // Gzip සඳහා
const app = express();

app.use(compression()); // ලොග්ස් වල 'accept-encoding: gzip' තියෙන නිසා මේක අනිවාර්යයි

app.get('/ver.php', (req, res) => {
    console.log(`[${new Date().toLocaleString()}] Handling OB53 Request...`);

    const responseData = {
        "code": 2,
        "is_server_open": true,
        "latest_release_version": "1.123.9", // එකක් වැඩියෙන් දාමු
        "remote_version": "1.123.9",
        "force_update": 0,
        "enable_patch": 1,
        "patchnote_url": "https://wheat-rna-holds-powerful.trycloudflare.com/notice",
        "server_url": "http://139.162.54.41:10001",
        "cdn_url": "https://wheat-rna-holds-powerful.trycloudflare.com/cdn",
        "md5": "7e94677df24a33519a49c4cfc85edf41",
        "pkg_md5": "99f1b4b2b23b52e79d16c93a851d1b35",
        "country_code": "SG",
        "whitelist_version": "1.5.0", // ලොග්ස් වල තිබ්බ අගයන්
        "whitelist_sp_version": "1.0.0"
    };

    const jsonStr = JSON.stringify(responseData);

    res.set({
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(jsonStr),
        'Cache-Control': 'public, max-age=0', // Cache එක refresh වෙන්න ඉඩ දෙමු
        'Server': 'Garena/FreeFire',
        'X-Unity-Version': '2022.3.47f1', // ලොග්ස් වල තිබ්බ Unity version එක
        'Access-Control-Allow-Origin': '*'
    });

    res.status(200).send(jsonStr);
});

app.all(['/notice', '/cdn'], (req, res) => res.status(200).send("OK"));

app.listen(80, '0.0.0.0', () => {
    console.log("🚀 Garena Impersonator Running...");
});
