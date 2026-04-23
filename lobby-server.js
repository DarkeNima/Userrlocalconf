const express = require('express');
const crypto = require('crypto');
const protobuf = require('protobufjs');

const app = express();
const PORT = 10001;

const MAIN_KEY = Buffer.from('Yg&tc%DEuh6%Zc^8', 'binary');
const MAIN_IV  = Buffer.from('6oyZDr22E3ychjM%', 'binary');

function aesDecrypt(data) {
    try {
        const decipher = crypto.createDecipheriv('aes-128-cbc', MAIN_KEY, MAIN_IV);
        return Buffer.concat([decipher.update(data), decipher.final()]);
    } catch (e) { return null; }
}

function aesEncrypt(data) {
    const cipher = crypto.createCipheriv('aes-128-cbc', MAIN_KEY, MAIN_IV);
    return Buffer.concat([cipher.update(data), cipher.final()]);
}

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
    console.log(`--- [Handshake] Received ${req.body.length} bytes ---`);
    
    // මෙන්න මේ පේළිය වැදගත්! Decrypt කරන්න කලින් එවන දේ බලමු.
    console.log(`📦 RAW Encrypted Hex: ${req.body.toString('hex')}`); 

    const decrypted = aesDecrypt(req.body);

    if (decrypted) {
        console.log("🔓 Decrypted Hex:", decrypted.toString('hex'));
        try {
            const LoginReq = root.lookupType('LoginReq');
            const reqMsg = LoginReq.decode(decrypted);
            console.log('✅ Decoded Request:', JSON.stringify(reqMsg));

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
            res.send(aesEncrypt(encoded));
            console.log("🚀 Login Response Sent Successfully!");
        } catch (err) { 
            console.log("❌ Protobuf Error:", err.message); 
        }
    } else {
        // මේ පාර Decrypt නොවීමට හේතුව මෙතනින් බලාගන්න පුළුවන්
        console.log("❌ Decryption Failed! The packet might be using a different Key or it's not AES.");
    }
    res.end();
});

app.get('/', (req, res) => res.send("Lobby Server is Online"));

app.listen(PORT, '0.0.0.0', () => console.log(`Server started on ${PORT}`));
