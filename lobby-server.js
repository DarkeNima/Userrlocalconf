const express = require('express');
const app = express();
const PORT = 10001;

// ගේම් එකෙන් එවන දත්ත කියවීමට
app.use(express.urlencoded({ extended: true }));
app.use(express.raw({ type: '*/*' }));

// ලොබී එකේ Ping request එකට උත්තර දීම
app.post('/Ping', (req, res) => {
    console.log(`[${new Date().toISOString()}] Ping received from Game!`);
    
    // ගේම් එක බලාපොරොත්තු වන සරල සාර්ථක ප්‍රතිචාරය
    res.status(200).send("OK");
});

// වෙනත් ඕනෑම Request එකක් ලොග් කරගන්න (Debug කිරීමට)
app.all('*', (req, res) => {
    console.log(`[${new Date().toISOString()}] Request to: ${req.url}`);
    res.status(200).json({ status: "success" });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Lobby API listening on port ${PORT}`);
});
