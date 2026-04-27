const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 80;

const TARGET_SERVER = "https://version.astutech.online";
const MY_DOMAIN = "navidu-ff.duckdns.org";

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 🚀 සියලුම Requests අහුකරගන්නා Proxy එක
app.all(/.*/, async (req, res) => {
    // 1. ගේම් එක ඉල්ලන පාර සහ දත්ත ටර්මිනල් එකේ පෙන්වීම
    console.log(`\n🔎 [PATH DETECTED]: ${req.method} ${req.path}`);
    
    try {
        // 2. Astute හෝ වෙනත් ටාගට් සර්වර් එකට රික්වෙස්ට් එක යැවීම
        const response = await axios({
            method: req.method,
            url: `${TARGET_SERVER}${req.path}`,
            data: req.body,
            headers: {
                ...req.headers,
                'host': 'version.astutech.online'
            },
            validateStatus: () => true // Error 404/403 ආවත් අපේ සර්වර් එක crash වෙන්නේ නැහැ
        });

        let data = response.data;

        // 3. ver.php දත්ත ලැබුණු විට ඒවා වෙනස් කිරීම
        if (req.path.includes('ver.php')) {
            console.log("🛠️  Modifying ver.php to bypass update...");
            
            data.is_server_open = true;
            data.latest_release_version = "OB53"; 
            data.remote_version = "OB53"; 

            // සර්වර් එකේ තියෙන ඔක්කොම URLs ඔයාගේ Domain එකට හරවනවා
            let dataStr = JSON.stringify(data);
            dataStr = dataStr.replace(/version\.astutech\.online/g, MY_DOMAIN);
            dataStr = dataStr.replace(/versions\.garenanow\.live/g, MY_DOMAIN);
            dataStr = dataStr.replace(/gin\.freefiremobile\.com/g, MY_DOMAIN); 
            // අලුත් Domains අහු වුණොත් ඒවා මෙතනට එකතු කරන්න
            data = JSON.parse(dataStr);

            console.log("✅ Modified JSON sent!");
        }

        // 4. යම් හෙයකින් Astute එකේ නැති Path එකක් නම් (404 ආවොත්)
        if (response.status === 404 || response.status === 403) {
            console.log(`⚠️  Warning: Path ${req.path} not found on target server (Status ${response.status})`);
        }

        res.set(response.headers);
        res.status(response.status).send(data);

    } catch (error) {
        console.log(`❌ ERROR on ${req.path}: ${error.message}`);
        res.status(200).send("OK");
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Universal Proxy active on Port 80`);
});
