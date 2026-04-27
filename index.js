const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 80;

const TARGET_SERVER = "https://version.astutech.online";
const MY_DOMAIN = "navidu-ff.duckdns.org";

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.all(/.*/, async (req, res) => {
    console.log(`\n🔎 [PATH]: ${req.method} ${req.path}`);
    
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
            console.log("🛠️  Injecting Astute Data & Fixing Code...");

            // 1. Astute එකේ දත්ත වලට අනුව code එක 0 කරමු (Success පෙන්වන්න)
            data.code = 0;
            data.is_server_open = true;

            // 2. URLs අපේ VPS එකට හරවමු
            let dataStr = JSON.stringify(data);
            dataStr = dataStr.replace(/gin\.freefiremobile\.com/g, MY_DOMAIN);
            dataStr = dataStr.replace(/version\.astutech\.online/g, MY_DOMAIN);
            
            data = JSON.parse(dataStr);

            // 3. අමතරව ගේම් එකට අවශ්‍ය Keys ටික බලෙන් ඇතුළත් කරමු
            data.latest_release_version = data.latest_release_version || "OB53";
            data.server_url = `http://${MY_DOMAIN}/`;

            console.log("✅ Modified Astute Data Sent!");
        }

        res.set(response.headers);
        res.status(response.status).send(data);

    } catch (error) {
        console.log(`❌ ERROR: ${error.message}`);
        res.status(200).send("OK");
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Proxy running on Port 80`);
});
