const dgram = require('dgram');
const crypto = require('crypto');
const server = dgram.createSocket('udp4');

const LOBBY_PORT = 10001;
const MAIN_KEY = Buffer.from('Yg&tc%DEuh6%Zc^8', 'binary');

// ඕනෑම පැකට් එකකට යවන පොදු සාර්ථක පිළිතුර
const SUCCESS_PAYLOAD = Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

function aesEncrypt(data, iv) {
    try {
        // IV එක byte 16ක් නැතිනම් ඒකට බිංදු එකතු කරලා 16ක් හදනවා
        let fixedIV = iv;
        if (iv.length < 16) {
            fixedIV = Buffer.alloc(16, 0);
            iv.copy(fixedIV);
        } else if (iv.length > 16) {
            fixedIV = iv.slice(0, 16);
        }
        
        const cipher = crypto.createCipheriv('aes-128-cbc', MAIN_KEY, fixedIV);
        cipher.setAutoPadding(false);
        return Buffer.concat([cipher.update(data), cipher.final()]);
    } catch (e) {
        console.log("❌ Encryption Error:", e.message);
        return null;
    }
}

server.on('message', (msg, rinfo) => {
    console.log(`📩 Received ${msg.length} bytes from ${rinfo.address}:${rinfo.port} | Hex: ${msg.toString('hex')}`);

    // Byte 4 හෝ byte 16 ඕනෑම එකකට response එකක් යවනවා
    const encryptedRes = aesEncrypt(SUCCESS_PAYLOAD, msg);
    
    if (encryptedRes) {
        server.send(encryptedRes, rinfo.port, rinfo.address, (err) => {
            if (err) console.log("❌ Send Error:", err);
            else console.log(`🚀 Response sent to ${rinfo.address}`);
        });
    }
});

server.on('listening', () => {
    console.log(`🔥 UDP Lobby Server is LIVE on port ${LOBBY_PORT}`);
});

server.bind(LOBBY_PORT);
