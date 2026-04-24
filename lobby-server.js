const express = require('express');
const crypto = require('crypto');
const protobuf = require('protobufjs');

const app = express();
const PORT = 10001;

const MAIN_KEY = Buffer.from('Yg&tc%DEuh6%Zc^8', 'binary');

const protoDefinition = `
syntax = "proto3";
message LoginReq { string account_id = 1; string token = 2; }
message LoginRes { 
    int32 result = 1; 
    uint64 account_id = 2; 
    string token = 3; 
    string server_url = 4; 
    int64 timestamp = 5;
    string country_code = 6;
    int32 ban_status = 7;
    string lock_region = 8;
    string noti_region = 9;
    string ip_region = 10;
    string new_active_region = 11;
    uint32 emulator_score = 12;
}
message CreateRoleRes { int32 result = 1; }
`;
const root = protobuf.Root.fromJSON(protobuf.parse(protoDefinition).root);

function aesEncrypt(data, iv) {
    const cipher = crypto.createCipheriv('aes-128-cbc', MAIN_KEY, iv);
    return Buffer.concat([cipher.update(data), cipher.final()]);
}

app.use(express.raw({ type: '*/*', limit: '2mb' }));

app.post('/Ping', async (req, res) => {
    const fullData = req.body;
    console.log(`--- [Network Log] Received ${fullData.length} bytes ---`);

    // 🚪 Gate 2: Handshake Success Logic
    if (fullData.length === 16) {
        console.log("🛠️ Gate 2: Handshake Probe. Sending Official Header...");
        
        // OB53 වල සමහර වෙලාවට ගේම් එක බලාපොරොත්තු වෙන්නේ 
        // ලැබුණු පැකට් එකේම පළමු bytes කිහිපය වෙනස් කරලා යවන එකයි.
        const handshakeRes = Buffer.alloc(16, 0);
        handshakeRes[0] = 0x0a; // Protobuf Tag
        handshakeRes[1] = 0x0e; // Length
        
        const encryptedResponse = aesEncrypt(handshakeRes, fullData); 
        res.send(encryptedResponse);
        return;
    }

    // 🚪 Gate 3: Login Handling with your UID
    if (fullData.length > 16) {
        const dynamicIV = fullData.subarray(0, 16);
        const encryptedPayload = fullData.subarray(16);

        try {
            const decipher = crypto.createDecipheriv('aes-128-cbc', MAIN_KEY, dynamicIV);
            const decrypted = Buffer.concat([decipher.update(encryptedPayload), decipher.final()]);
            
            console.log("🔓 Decrypted Hex:", decrypted.toString('hex'));

            // Login Response එක හදමු ඔයාගේ UID එකත් එක්ක
            const LoginRes = root.lookupType('LoginRes');
            const responsePayload = {
                result: 0,
                account_id: "13989823065", // ඔයාගේ ඇත්තම UID එක මෙන්න මෙතනට දැම්මා
                token: "ST-83294-random-token-v3-deepseek",
                server_url: "http://139.162.54.41:10001",
                timestamp: Math.floor(Date.now() / 1000),
                country_code: "IN",
                ban_status: 0,
                lock_region: "IND",
                noti_region: "IND",
                ip_region: "IND",
                new_active_region: "IND",
                emulator_score: 0
            };

            const encoded = LoginRes.encode(responsePayload).finish();
            res.send(Buffer.concat([dynamicIV, aesEncrypt(encoded, dynamicIV)]));
            console.log("🚀 Login Success Sent for UID: 13989823065");

        } catch (err) {
            console.log("❌ Data Error:", err.message);
        }
    }
    res.end();
});

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server listening on ${PORT}`));
