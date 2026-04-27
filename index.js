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
            console.log("🛠️ --- MODIFYING VER.PHP DATA ---");
            
            // 1. Force Server Open
            data.is_server_open = true;
            
            // 2. Bypass Update
            // මචං, මෙතන "OB53" හරියන්නේ නැත්නම් ඔයාගේ ගේම් එකේ ඇත්තම version එක (උදා: "1.103.1") මෙතනට දාන්න.
            data.latest_release_version = "OB53"; 
            data.remote_version = "OB53"; 

            // 3. Domain Replacement
            // Astute සර්වර් එකේ URLs ඔක්කොම ඔයාගේ DuckDNS එකට හරවනවා.
            let dataStr = JSON.stringify(data);
            dataStr = dataStr.replace(/version\.astutech\.online/g, MY_DOMAIN);
            dataStr = dataStr.replace(/versions\.garenanow\.live/g, MY_DOMAIN);
            dataStr = dataStr.replace(/gin\.freefiremobile\.com/g, MY_DOMAIN); 
            data = JSON.parse(dataStr);

            console.log("✅ Modified JSON sent to game!");
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
