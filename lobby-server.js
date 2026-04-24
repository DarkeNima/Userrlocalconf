const net = require('net');
const crypto = require('crypto');

const LOBBY_PORT = 10001;
const MAIN_KEY = Buffer.from('Yg&tc%DEuh6%Zc^8', 'binary');
const HANDSHAKE_RESPONSE_PAYLOAD = Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

function aesEncrypt(data, iv) {
    const cipher = crypto.createCipheriv('aes-128-cbc', MAIN_KEY, iv);
    cipher.setAutoPadding(false); // පෑඩින් ඕනේ නැහැ, කෙළින්ම 16 bytes යවන්න
    return Buffer.concat([cipher.update(data), cipher.final()]);
}

const server = net.createServer((socket) => {
    console.log(`[${new Date().toLocaleString()}] New Connection Detected!`);

    socket.on('data', (data) => {
        console.log(`--- Received ${data.length} bytes ---`);
        
        if (data.length === 16) {
            console.log("🛠️ Handshake Probe Detected. Using incoming bytes as IV...");
            const clientIV = data; // ලැබෙන bytes 16 ම IV එකයි
            
            const encryptedResponse = aesEncrypt(HANDSHAKE_RESPONSE_PAYLOAD, clientIV);
            socket.write(encryptedResponse);
            console.log(`🚀 Handshake Success Sent: ${encryptedResponse.toString('hex')}`);
        } else {
            console.log("🔓 Future Packet (Login Data?) Received:", data.toString('hex'));
        }
    });

    socket.on('error', (err) => console.log("Socket Error:", err.message));
});

server.listen(LOBBY_PORT, '0.0.0.0', () => {
    console.log(`🔥 OB53 Raw TCP Lobby Server is LIVE on port ${LOBBY_PORT}`);
});
