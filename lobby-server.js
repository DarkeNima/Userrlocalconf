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
    string account_id = 2; 
    string token = 3; 
    string server_url = 4; 
    int64 timestamp = 5;
    string country_code = 6;
    int32 ban_status = 7;
}
`;
const root = protobuf.Root.fromJSON(protobuf.parse(protoDefinition).root);

app.use(express.raw({ type: '*/*', limit: '2mb' }));

// /Ping endpoint එක විතරක් handle කරනවා
app.post('/Ping', async (req, res) => {
    console.log(`--- [Handshake] Received ${req.body.length} bytes ---`);
    const decrypted = aesDecrypt(req.body);
    if (decrypted) {
        try {
            const LoginReq = root.lookupType('LoginReq');
            const reqMsg = LoginReq.decode(decrypted);
            console.log('✅ Decoded Request:', reqMsg);

            const LoginRes = root.lookupType('LoginRes');
            const responsePayload = {
                result: 0,
                account_id: reqMsg.account_id || "1001",
                token: reqMsg.token || "session_tkn",
                server_url: "http://139.162.54.41:10001",
                timestamp: Math.floor(Date.now() / 1000),
                country_code: "IN",
                ban_status: 0
            };
            res.send(aesEncrypt(LoginRes.encode(responsePayload).finish()));
            console.log("🚀 Login Response Sent!");
        } catch (err) { console.log("❌ Protobuf Error"); }
    } else {
        console.log("❌ Decryption Failed");
    }
    res.end();
});

// අර Error එක එන පේළිය මෙන්න මේ විදිහට වෙනස් කළා:
app.get('/', (req, res) => res.send("Lobby Server is Online"));

app.listen(PORT, '0.0.0.0', () => console.log(`Server started on ${PORT}`));
