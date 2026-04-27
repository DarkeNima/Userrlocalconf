const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 80;

const TARGET_SERVER = "https://version.astutech.online";
const MY_DOMAIN = "navidu-ff.duckdns.org";

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.all(/.*/, async (req, res) => {
    // 🔎 මෙතන ලොග් එකක් වැටෙනවද කියලා හොඳට බලන්න
    console.log(`\n🔎 [INCOMING]: ${req.method} ${req.url}`);
    
    try {
        const response = await axios({
            method: req.method,
            url: `${TARGET_SERVER}${req.url}`,
            data: req.body,
            headers: {
                'host': 'version.astutech.online',
                'user-agent': req.headers['user-agent']
            },
            timeout: 10000, // 10s timeout
            validateStatus: () => true 
        });

        let data = response.data;

        // Astute එකේ data ටික අපේ VPS එකට හරවනවා
        if (req.url.includes('ver.php')) {
            console.log("🛠️  Modifying ver.php...");
            data.code = 0;
            data.is_server_open = true;
            
            let dataStr = JSON.stringify(data);
            dataStr = dataStr.replace(/gin\.freefiremobile\.com/g, MY_DOMAIN);
            dataStr = dataStr.replace(/version\.astutech\.online/g, MY_DOMAIN);
            data = JSON.parse(dataStr);
        }

        res.status(response.status).send(data);

    } catch (error) {
        console.log(`❌ PROXY ERROR: ${error.message}`);
        res.status(200).send("OK");
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Proxy active on Port 80. Waiting for requests...`);
});
