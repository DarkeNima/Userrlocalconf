const express = require('express');
const app = express();

app.get('/ver.php', (req, res) => {
    console.log(`[${new Date().toLocaleString()}] Unity Request: /ver.php`);

    // Astute ලගේ OB53 වලට ගැලපෙනම Format එක
    const responseData = {
        "code": 0, // මේ පාර 0 දීලා බලමු (සමහර Version වලට 0 තමයි Success)
        "is_server_open": true,
        "latest_release_version": "1.123.9", 
        "remote_version": "1.123.9",
        "force_update": 0,
        "enable_patch": 1,
        "patchnote_url": "https://suspended-suits-paintings-mae.trycloudflare.com/notice",
        "billboard_msg": "",
        "maintain_msg": "",
        "server_url": "http://139.162.54.41:10001",
        "ggp_url": "139.162.54.41:10001",
        "cdn_url": "https://suspended-suits-paintings-mae.trycloudflare.com/cdn",
        "md5": "7e94677df24a33519a49c4cfc85edf41",
        "pkg_md5": "99f1b4b2b23b52e79d16c93a851d1b35",
        "country_code": "SG"
    };

    // අත්‍යවශ්‍ය Headers
    res.set({
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
        'Server': 'Garena/FreeFire'
    });

    // JSON එක එක පේළියට (Minified) යවමු
    res.status(200).send(JSON.stringify(responseData));
});

// Favicon request එක handle කරමු
app.get('/favicon.ico', (req, res) => res.status(204).end());

app.listen(80, '0.0.0.0', () => {
    console.log("🚀 Final Attempt API Running...");
});
