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
message CreateRoleReq { string nickname = 1; }
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

    // 🚪 Gate 2: Handshake Probe (16-byte check)
    if (fullData.length === 16) {
        console.log("🛠️ Gate 2 Handshake: Sending Encrypted Success Response...");
        const successBuffer = Buffer.alloc(16, 0); // 00 00 00...
        // මේකට static IV එකක් වෙනුවට එන දත්තම පාවිච්චි කරමු
        const encryptedResponse = aesEncrypt(successBuffer, fullData); 
        res.send(encryptedResponse);
        return;
    }

    // 🚪 Gate 3 & Beyond: Data Handling
    if (fullData.length > 16) {
        const dynamicIV = fullData.subarray(0, 16);
        const encryptedPayload = fullData.subarray(16);

        try {
            const decipher = crypto.createDecipheriv('aes-128-cbc', MAIN_KEY, dynamicIV);
            const decrypted = Buffer.concat([decipher.update(encryptedPayload), decipher.final()]);
            
            console.log("🔓 Decrypted Hex:", decrypted.toString('hex'));

            // 1. මේක LoginRequest එකක්ද බලමු
            try {
                const LoginReq = root.lookupType('LoginReq');
                const reqMsg = LoginReq.decode(decrypted);
                
                if (reqMsg.account_id) {
                    console.log('✅ Auth Request Received:', JSON.stringify(reqMsg));
                    const LoginRes = root.lookupType('LoginRes');
                    const responsePayload = {
                        result: 0,
                        account_id: 1001556, // ඔයාගේ UID එක මෙතනට දාන්න
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
                    res.send(Buffer.concat([dynamicIV, aesEncrypt(encoded, dynamicIV)]));
                    console.log("🚀 Login Response Sent!");
                    return;
                }
            } catch(e) {}

            // 2. මේක CreateRole එකක්ද (නම දාන එක) බලමු
            try {
                const CreateRoleRes = root.lookupType('CreateRoleRes');
                const encoded = CreateRoleRes.encode({ result: 0 }).finish();
                res.send(Buffer.concat([dynamicIV, aesEncrypt(encoded, dynamicIV)]));
                console.log("🚀 CreateRole Success Sent!");
            } catch(e) {}

        } catch (err) {
            console.log("❌ Data Error:", err.message);
        }
    }
    res.end();
});

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server on port ${PORT}`));
