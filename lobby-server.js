const express = require('express');
const crypto = require('crypto');
const protobuf = require('protobufjs');

const app = express();
const PORT = 10001;

// OB53 Static AES Key
const MAIN_KEY = Buffer.from('Yg&tc%DEuh6%Zc^8', 'binary');

// Protobuf structure (LoginRes එකට ඕන හැම දේම මම මෙතනට දැම්මා)
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
    console.log(`--- [Network Log] Received ${fullData.length} bytes ---`);

    // 🚪 Gate 2: Handshake Probe (16-byte check)
    if (fullData.length === 16) {
        console.log("🛠️ Gate 2 Handshake detected. Echoing using Dynamic IV...");
        
        // DeepSeek කිව්ව විදිහට මේ bytes 16 ම IV එක සහ Ciphertext එක විදිහට සලකමු
        // ගේම් එක බලාපොරොත්තු වෙන්නේ සර්වර් එක මේක decrypt කරලා 
        // ආපහු valid response එකක් දෙන එකයි.
        res.send(fullData); 
        return;
    }

    // 🚪 Gate 3: The Full Login Payload (960+ bytes)
    if (fullData.length > 16) {
        const dynamicIV = fullData.subarray(0, 16);
        const encryptedPayload = fullData.subarray(16);

        try {
            const decipher = crypto.createDecipheriv('aes-128-cbc', MAIN_KEY, dynamicIV);
            const decrypted = Buffer.concat([decipher.update(encryptedPayload), decipher.final()]);
            
            console.log("🔓 Gate 3 Decrypted Payload:", decrypted.toString('hex'));

            const LoginReq = root.lookupType('LoginReq');
            const reqMsg = LoginReq.decode(decrypted);
            console.log('✅ Received Auth Data:', JSON.stringify(reqMsg));

            // මෙතන තමයි සැබෑ LoginRes එක හදන්නේ
            const LoginRes = root.lookupType('LoginRes');
            const responsePayload = {
                result: 0,
                account_id: 1001556, // ඔයාට ඕන UID එක
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
            const cipher = crypto.createCipheriv('aes-128-cbc', MAIN_KEY, dynamicIV);
            const encryptedRes = Buffer.concat([cipher.update(encoded), cipher.final()]);

            res.send(Buffer.concat([dynamicIV, encryptedRes]));
            console.log("🚀 Gate 3: Final Login Response Sent!");

        } catch (err) {
            console.log("❌ Gate 3 Error:", err.message);
            res.end();
        }
    } else {
        res.end();
    }
});

app.get('/', (req, res) => res.send("Lobby Server Online"));
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Lobby Server active on port ${PORT}`));
