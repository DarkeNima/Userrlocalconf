const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 80;

// ටාගට් එක මාරු කරලා බලන්නත් පුළුවන්
const TARGET_SERVER = "https://version.astutech.online"; 

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
                // Host header එක target එකට ගැලපෙන්න වෙනස් කිරීම වැදගත්
                host: new URL(TARGET_SERVER).host 
            },
            validateStatus: () => true,
            timeout: 10000 // තත්පර 10කින් timeout වෙනවා
        });

        console.log(`✅ [TARGET RESPONSE]: ${response.status}`);
        
        // ගේම් එකට දත්ත යැවීම
        res.set(response.headers);
        res.status(response.status).send(response.data);

    } catch (error) {
        console.log(`❌ [ERROR]: ${error.message}`);
        // Proxy එකේ අවුලක් ආවත් ගේම් එකට මොනවා හරි යවනවා
        res.status(200).send("OK"); 
    }
});

// Port එකේ අවුලක් තියෙනවාද බලන්න Error handle එකක් දැම්මා
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Proxy Server Started on Port ${PORT}`);
    console.log(`🎯 Targeting: ${TARGET_SERVER}`);
});

server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.log('❌ ERROR: Port 80 is already in use! Run: sudo fuser -k 80/tcp');
    } else {
        console.log('❌ SERVER ERROR:', e);
    }
});
