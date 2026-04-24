const dgram = require('dgram');
const crypto = require('crypto');
const server = dgram.createSocket('udp4');

const LOBBY_PORT = 10001;
const MAIN_KEY = Buffer.from('Yg&tc%DEuh6%Zc^8', 'binary');

// Handshake එකට යවන සාමාන්‍ය උත්තරය
const SUCCESS_PAYLOAD = Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

function aesEncrypt(data, iv) {
    const cipher = crypto.createCipheriv('aes-128-cbc', MAIN_KEY, iv);
    cipher.setAutoPadding(false);
    return Buffer.concat([cipher.update(data), cipher.final()]);
}

server.on('message', (msg, rinfo) => {
    console.log(`📩 Received ${msg.length} bytes from ${rinfo.address}:${rinfo.port}`);

    if (msg.length === 16) {
        console.log("🛠️ UDP Handshake Probe Detected!");
        const clientIV = msg; // 16-byte packet එකම IV එක විදිහට ගන්නවා
        
        const encryptedRes = aesEncrypt(SUCCESS_PAYLOAD, clientIV);
        
        // UDP වලදී දත්ත ආපහු යවන්නේ මෙහෙමයි
        server.send(encryptedRes, rinfo.port, rinfo.address, (err) => {
            if (err) console.log("❌ Send Error:", err);
            else console.log("🚀 UDP Handshake Success Sent!");
        });
    } else {
        console.log("🔓 Larger UDP Packet Received (Hex):", msg.toString('hex'));
    }
});

server.on('listening', () => {
    const address = server.address();
    console.log(`🔥 UDP Lobby Server is LIVE on ${address.address}:${address.port}`);
});

server.bind(LOBBY_PORT);
