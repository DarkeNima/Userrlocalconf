const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 80;

const TARGET_SERVER = "https://version.astutech.online";
const MY_DOMAIN = "navidu-ff.duckdns.org";

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.all(/.*/, async (req, res) => {
    console.log(`\n🔄 [REQUEST]: ${req.method} ${req.path}`);
    
    try {
        const response = await axios({
            method: req.method,
            url: `${TARGET_SERVER}${req.path}`,
            data: req.body,
            headers: {
                ...req.headers,
                'host': 'version.astutech.online'
            },
            validateStatus: () => true
        });

        let data = response.data;

        if (req.path.includes('ver.php')) {
            console.log("🛠️ Fixing Version & Bypass Update...");
            
            // 1. Force Open
            data.is_server_open = true;
            
            // 2. Bypass Update (මෙතන OB53 වෙනුවට ඔයාගේ දැනට තියෙන Version එක දාන්නත් පුළුවන්)
            // ගොඩක් වෙලාවට remote_version එක ඔයාගේ ගේම් එකේ තියෙන එකට සමාන කළාම Update එක එන්නේ නැහැ.
            data.latest_release_version = "OB53"; 
            
            // 3. URLs වෙනස් කිරීම
            let dataStr = JSON.stringify(data);
            dataStr = dataStr.replace(/version\.astutech\.online/g, MY_DOMAIN);
            dataStr = dataStr.replace(/versions\.garenanow\.live/g, MY_DOMAIN);
            data = JSON.parse(dataStr);

            console.log("✅ Version Bypassed!");
        }

        res.set(response.headers);
        res.status(response.status).send(data);

    } catch (error) {
        console.log(`❌ ERROR: ${error.message}`);
        res.status(200).send("OK");
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Bypass Proxy active on Port 80`);
});
