const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 80;

// අපි මේ සර්වර් එක Proxy එකක් විදියට පාවිච්චි කරමු
const TARGET_SERVER = "https://version.astutech.online"; 

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.all(/.*/, async (req, res) => {
    console.log(`\n🔄 [RELAYING]: ${req.method} ${req.path}`);
    
    try {
        // වැඩ කරන සර්වර් එකට රික්වෙස්ට් එක යවනවා
        const response = await axios({
            method: req.method,
            url: `${TARGET_SERVER}${req.path}`,
            data: req.body,
            headers: {
                ...req.headers,
                host: 'version.astutech.online' // Target host එක වෙනස් කරන්න ඕනේ
            },
            validateStatus: () => true // මොන status code එක ආවත් අල්ලගන්න
        });

        console.log(`✅ [RESPONSE FROM TARGET]: Status ${response.status}`);
        console.log(`📦 [DATA]:`, JSON.stringify(response.data).substring(0, 500)); // මුල් අකුරු 500 විතරක් බලමු

        // ආපු දත්ත ටික එහෙම්මම ගේම් එකට දෙනවා
        res.set(response.headers);
        res.status(response.status).send(response.data);

    } catch (error) {
        console.error(`❌ [PROXY ERROR]: ${error.message}`);
        res.status(500).send("Proxy Error");
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Proxy Logger active on Port ${PORT}`);
});
