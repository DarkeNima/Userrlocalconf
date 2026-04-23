const express = require('express');
const crypto = require('crypto');
const protobuf = require('protobufjs');

const app = express();
const PORT = 10001;

// Key එක static, හැබැයි IV එක දැන් dynamic (packet එකෙන් ගන්නවා)
const MAIN_KEY = Buffer.from('Yg&tc%DEuh6%Zc^8', 'binary');

// Protobuf Definition (OB53 වලට ගැලපෙන විදිහට)
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
`;
const root = protobuf.Root.fromJSON(protobuf.parse(protoDefinition).root);

app.use(express.raw({ type: '*/*', limit: '2mb' }));

app.post('/Ping', async (req, res) => {
    const fullData = req.body;
    console.log(`--- [Handshake] Received ${fullData.length} bytes ---`);

    if (fullData.length <= 16) {
        // DeepSeek කිව්වා වගේ 16 bytes විතරක් එනවා නම් ඒක Echo කරමු
        console.log("⚠️ Short packet received. Echoing back to client...");
        res.send(fullData);
        return;
    }

    // දත්ත වල මුල් bytes 16 IV එක විදිහට ගමු
    const dynamicIV = fullData.subarray(0, 16);
    const encryptedPayload = fullData.subarray(16);

    try {
        const decipher = crypto.createDecipheriv('aes-128-cbc', MAIN_KEY, dynamicIV);
        const decrypted = Buffer.concat([decipher.update(encryptedPayload), decipher.final()]);
        
        console.log("🔓 Decrypted Payload (Hex):", decrypted.toString('hex'));

        const LoginReq = root.lookupType('LoginReq');
        const reqMsg = LoginReq.decode(decrypted);
        console.log('✅ Decoded Request:', JSON.stringify(reqMsg));

        // Response එක හදමු
        const LoginRes = root.lookupType('LoginRes');
        const responsePayload = {
            result: 0,
            account_id: 1001556, 
            token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.Et9z_o9_S9K65_K0",
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
        
        // Response එකත් අර dynamic IV එකෙන්ම encrypt කරලා යවමු
        const cipher = crypto.createCipheriv('aes-128-cbc', MAIN_KEY, dynamicIV);
        const encryptedRes = Buffer.concat([cipher.update(encoded), cipher.final()]);
        
        // ගේම් එක බලාපොරොත්තු වෙන්නේ [IV (16 bytes)] + [Encrypted Data] කියන structure එකයි
        res.send(Buffer.concat([dynamicIV, encryptedRes]));
        console.log("🚀 Login Response Sent with Dynamic IV!");

    } catch (err) {
        console.log("❌ Decryption/Protobuf Error:", err.message);
        res.end();
    }
});

app.get('/', (req, res) => res.send("Lobby Server is Online"));
app.listen(PORT, '0.0.0.0', () => console.log(`Server started on ${PORT}`));
