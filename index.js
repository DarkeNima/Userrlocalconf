const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 80;

const TARGET_SERVER = "https://version.astutech.online";
const MY_DOMAIN = "navidu-ff.duckdns.org"; // ඔයාගේ DuckDNS එක

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.all(/.*/, async (req, res) => {
    console.log(`\n🔄 [PROXY REQUEST]: ${req.method} ${req.path}`);
    
    try {
        const response = await axios({
            method: req.method,
            url: `${TARGET_SERVER}${req.path}`,
            data: req.body,
            headers: {
                ...req.headers,
                'host': 'version.astutech.online',
                'accept-encoding': 'identity' 
            },
            validateStatus: () => true
        });

        let data = response.data;

        // --- මෙතනදී අපි දත්ත "හොරාට" වෙනස් කරනවා ---
        if (req.path.includes('ver.php')) {
            console.log("🛠️ Fixing Maintenance & URLs...");
            
            // 1. සර්වර් එක අනිවාර්යයෙන්ම ඕපන් කරනවා
            data.is_server_open = true;
            
            // 2. සර්වර් එකේ තියෙන URLs ඔක්කොම ඔයාගේ සර්වර් එකට හරවනවා
            // එතකොට ගේම් එක දිගටම ඔයාගේ VPS එකටම කතා කරයි
            let dataStr = JSON.stringify(data);
            dataStr = dataStr.replace(/version\.astutech\.online/g, MY_DOMAIN);
            dataStr = dataStr.replace(/versions\.garenanow\.live/g, MY_DOMAIN);
            data = JSON.parse(dataStr);
            
            console.log("✅ Fixed Data Sent to Game!");
        }

        console.log(`📡 Status: ${response.status}`);
        res.set(response.headers);
        res.status(response.status).send(data);

    } catch (error) {
        console.log(`❌ ERROR: ${error.message}`);
        res.status(200).send("OK");
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Force-Open Proxy active on Port ${PORT}`);
});
