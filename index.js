const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 80;

// ✅ ඔයාගේ දත්ත
const TARGET_SERVER = "https://version.astutech.online";
const MY_DOMAIN = "navidu-ff.duckdns.org";

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 🚀 සියලුම Requests අහුකරගන්නා Universal Proxy එක
app.all(/.*/, async (req, res) => {
    console.log(`\n🔎 [PATH DETECTED]: ${req.method} ${req.path}`);
    
    try {
        // Astute සර්වර් එකට Request එක යැවීම
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

        // --- ver.php දත්ත ලැබුණු විට කරන වෙනස්කම් ---
        if (req.path.includes('ver.php')) {
            console.log("🛠️  Cleaning URLs & Routing to Astute...");
            
            // 1. සර්වර් එක ඕපන් කරලා පරණ Version දත්ත Update කරනවා
            data.is_server_open = true;
            data.latest_release_version = "OB53"; 
            data.remote_version = "OB53"; 
            data.display_version = "OB53";

            // 2. URL Replacement Logic
            let dataStr = JSON.stringify(data);

            // GarenaNow පාරවල් ඔක්කොම අයින් කරලා Astute වලට හරවනවා
            dataStr = dataStr.replace(/versions\.garenanow\.live/g, "version.astutech.online");

            // දැන් Response එකේ තියෙන Astute පාරවල් ඔක්කොම ඔයාගේ VPS එකට හරවනවා
            dataStr = dataStr.replace(/version\.astutech\.online/g, MY_DOMAIN);
            dataStr = dataStr.replace(/gin\.freefiremobile\.com/g, MY_DOMAIN); 

            data = JSON.parse(dataStr);

            // 3. Force Domain Lock
            data.server_url = `http://${MY_DOMAIN}/`;
            data.core_url = MY_DOMAIN;
            data.core_ip_list = [MY_DOMAIN, "0.0.0.0"];

            console.log("✅ Proxy re-routed to Astute & Version Bypassed!");
        }

        // Response එක ගේම් එකට යැවීම
        res.set(response.headers);
        res.status(response.status).send(data);

    } catch (error) {
        console.log(`❌ ERROR on ${req.path}: ${error.message}`);
        res.status(200).send("OK");
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Universal Proxy is active on Port 80`);
});

// 📡 TCP Core Listener (මැච් එක ඇතුළත දත්ත සඳහා)
const net = require('net');
const tcpServer = net.createServer((socket) => {
    console.log(`\n📡 [TCP CONNECT] Client: ${socket.remoteAddress}`);
    socket.on('data', (data) => {
        console.log(`📩 [TCP DATA]: ${data.length} bytes | HEX: ${data.toString('hex')}`);
    });
    socket.on('error', (err) => console.log(`❌ TCP Error: ${err.message}`));
});

tcpServer.listen(7006, '0.0.0.0', () => {
    console.log("🚀 TCP Core Listener is active on Port 7006");
});
