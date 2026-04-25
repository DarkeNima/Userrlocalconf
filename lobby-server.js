const dgram = require('dgram');
const server = dgram.createSocket('udp4');

server.on('message', (msg, rinfo) => {
    // ගේම් එකෙන් එන දත්ත Hex විදිහට බලමු
    console.log(`📩 PACKET FROM ${rinfo.address}:${rinfo.port}`);
    console.log(`📦 SIZE: ${msg.length} bytes | HEX: ${msg.toString('hex')}`);
});

server.bind(10001, () => {
    console.log("🔥 LOBBY DEBUG MODE ON - PORT 10001");
});
