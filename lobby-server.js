const express = require('express');
const crypto = require('crypto');
const protobuf = require('protobufjs');

const app = express();
const PORT = 10001;

const MAIN_KEY = Buffer.from('Yg&tc%DEuh6%Zc^8', 'binary');
const MAIN_IV  = Buffer.from('6oyZDr22E3ychjM%', 'binary');

function aesDecrypt(data) {
    const decipher = crypto.createDecipheriv('aes-128-cbc', MAIN_KEY, MAIN_IV);
    return Buffer.concat([decipher.update(data), decipher.final()]);
}

function aesEncrypt(data) {
    const cipher = crypto.createCipheriv('aes-128-cbc', MAIN_KEY, MAIN_IV);
    return Buffer.concat([cipher.update(data), cipher.final()]);
}

// Protobuf Structure
const protoDefinition = `
syntax = "proto3";
message LoginReq { string account_id = 1; string token = 2; }
message LoginRes { int32 result = 1; string account_id = 2; string token = 3; string server_url = 4; int64 timestamp = 5; }
`;
const root = protobuf.Root.fromJSON(protobuf.parse(protoDefinition).root);

app.use(express.raw({ type: '*/*', limit: '2mb' }));

app.post('/Ping', async (req, res) => {
    try {
        console.log(`--- Login Attempt: ${req.body.length} bytes ---`);
        const decrypted = aesDecrypt(req.body);
        
        const LoginReq = root.lookupType('LoginReq');
        const reqMsg = LoginReq.decode(decrypted);
        console.log('Decoded Request:', reqMsg);

        const LoginRes = root.lookupType('LoginRes');
        const responseMsg = {
            result: 0,
            account_id: reqMsg.account_id || '1000001',
            token: reqMsg.token || 'session_token',
            server_url: `http://139.162.54.41:10001`, // ඔයාගේ IP එක
            timestamp: Math.floor(Date.now() / 1000)
        };

        const encodedResponse = LoginRes.encode(responseMsg).finish();
        const encryptedResponse = aesEncrypt(encodedResponse);

        res.set({ 'Content-Type': 'application/octet-stream' });
        res.send(encryptedResponse);
        console.log('✅ Response Sent!');
    } catch (err) {
        console.error('❌ Error:', err.message);
        res.status(500).send('Error');
    }
});

app.all('*', (req, res) => res.status(200).send("OK"));

app.listen(PORT, '0.0.0.0', () => console.log(`Lobby Server Online on ${PORT}`));
