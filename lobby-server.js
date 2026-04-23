const express = require('express');
const crypto = require('crypto');
const app = express();
const PORT = 10001;

// DeepSeek දුන්න රහස් Keys
const MAIN_KEY = Buffer.from('Yg&tc%DEuh6%Zc^8', 'binary');
const MAIN_IV = Buffer.from('6oyZDr22E3ychjM%', 'binary');

app.use(express.raw({ type: '*/*', limit: '1mb' }));

// දත්ත Decrypt කරන Function එක
function aesCbcDecrypt(encryptedData) {
    try {
        let decipher = crypto.createDecipheriv('aes-128-cbc', MAIN_KEY, MAIN_IV);
        let decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
        return decrypted;
    } catch (err) {
        console.error("Decryption failed:", err.message);
        return null;
    }
}

// /Ping handle කිරීමට
app.post('/Ping', (req, res) => {
    console.log(`[${new Date().toISOString()}] Ping received!`);
    res.status(200).send("OK");
});

// අලුත් ක්‍රමයට ඕනෑම Request එකක් handle කිරීම (PathError එක නැති කිරීමට)
app.all(/^(.*)$/, (req, res) => {
    console.log(`[${new Date().toISOString()}] Request to: ${req.url}`);
    
    if (req.body && req.body.length > 0) {
        console.log(`Received ${req.body.length} bytes.`);
        const decrypted = aesCbcDecrypt(req.body);
        
        if (decrypted) {
            console.log("✅ Decrypted Data (Hex):", decrypted.toString('hex').substring(0, 100));
            // ගේම් එකට ලැබුණු දත්තම ආපහු යවමු (Echo)
            res.setHeader('Content-Type', 'application/octet-stream');
            res.send(req.body);
        } else {
            res.status(400).send("Decryption Error");
        }
    } else {
        res.status(200).send("OK");
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Lobby Server running on port ${PORT}`);
});
