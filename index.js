const express = require('express');
const axios = require('axios');
const app = express();

const ASTUTECH_BASE = "https://version.astutech.online";
const MY_URL = "http://navidu-ff.duckdns.org";
const MY_IP = "139.162.54.41";
const PORT = 80;

app.use(express.json());

// 1. Version Check (ver.php)
app.get('/ver.php', (req, res) => {
    const responseData = {
        "code": 0,
        "is_server_open": true,
        "latest_release_version": "OB53",
        "remote_version": "1.123.8",
        "server_url": `${MY_URL}`, // මෙතන අන්තිමට තිබ්බ / එක අයින් කරා
        "core_url": "csoversea.castle.freefiremobile.com",
        "core_ip_list": [MY_IP, "0.0.0.0"],
        "ggp_url": "gin.freefiremobile.com"
    };
    res.status(200).send(JSON.stringify(responseData).replace(/\//g, '\\/'));
});

// 2. 🕵️‍♂️ Astutech Proxy - URL පාරවල් හරියටම පෑස්සීම
app.use(async (req, res, next) => {
    if (req.path === '/ver.php') return next();

    // path එකේ මුලට තියෙන / එක සහ ASTUTECH_BASE එක පෑස්සීම
    let cleanPath = req.path;
    if (cleanPath.startsWith('//')) cleanPath = cleanPath.substring(1);
    
    const targetUrl = `${ASTUTECH_BASE}${cleanPath}`;
    console.log(`🎯 [PROXYING TO]: ${targetUrl}`);

    try {
        const response = await axios({
            method: req.method,
            url: targetUrl,
            data: req.body,
            headers: {
                ...req.headers,
                'host': 'version.astutech.online'
            }
        });

        console.log(`✅ [DATA FROM ASTUTECH]:`, JSON.stringify(response.data));
        res.status(response.status).json(response.data);

    } catch (error) {
        console.log(`❌ [FAILED]: ${error.message} on ${targetUrl}`);
        if (error.response) {
            console.log(`📦 Body:`, JSON.stringify(error.response.data));
        }
        res.status(200).send("OK");
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 PATH-FIXED PROXY LIVE!`);
});
