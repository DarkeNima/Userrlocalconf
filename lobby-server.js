const express = require('express');
const crypto = require('crypto');
const app = express();
const PORT = 10001;

const MAIN_KEY = Buffer.from('Yg&tc%DEuh6%Zc^8', 'binary');
const MAIN_IV = Buffer.from('6oyZDr22E3ychjM%', 'binary');

app.use(express.raw({ type: '*/*', limit: '1mb' }));

function aesCbcDecrypt(encryptedData) {
    try {
        let decipher = crypto.createDecipheriv('aes-128-cbc', MAIN_KEY, MAIN_IV);
        let decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
        return decrypted;
    } catch (err) {
        return null;
    }
}

app.post('/Ping', (req, res) => {
    res.status(200).send("OK");
});

// අර PathError එක එන්නේ නැති වෙන්න මේ විදිහට දාන්න
app.all('*', (req, res) => {
    if (req.body && req.body.length > 0) {
        const decrypted = aesCbcDecrypt(req.body);
        if (decrypted) {
            console.log("✅ Decrypted:", decrypted.toString('hex').substring(0, 50));
            res.setHeader('Content-Type', 'application/octet-stream');
            res.send(req.body); 
        } else {
            res.status(400).send("Error");
        }
    } else {
        res.status(200).send("OK");
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Lobby Server running on port ${PORT}`);
});
