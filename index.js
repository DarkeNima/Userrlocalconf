const express = require('express');
const compression = require('compression');
const app = express();

app.use(compression());

// ලොග්ස් බලාගන්න විතරක් මේක තියමු
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleString()}] Request: ${req.method} ${req.path}`);
    next();
});

// ප්‍රධාන endpoint එක
app.get('/ver.php', (req, res) => {
    const data = {
        "code": 2,
        "is_server_open": true,
        "latest_release_version": "1.123.8",
        "remote_version": "1.123.8",
        "force_update": 0,
        "enable_patch": 0, 
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

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).send(JSON.stringify(data));
});

// අතුරු endpoints වෙන වෙනම ලියමු (එතකොට අර Error එක එන්නේ නැහැ)
app.get('/', (req, res) => res.status(200).send("OK"));
app.get('/notice', (req, res) => res.status(200).send("OK"));
app.get('/cdn', (req, res) => res.status(200).send("OK"));
app.get('/favicon.ico', (req, res) => res.status(200).send("OK"));

app.listen(80, '0.0.0.0', () => {
    console.log("🚀 FINAL ATTEMPT - Garena Impersonator Online!");
});
