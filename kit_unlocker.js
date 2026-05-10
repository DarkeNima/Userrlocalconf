// kit_unlocker.js

module.exports = function handleGameData(socket, data) {
    console.log(`\n📦 [TCP Packet] Size: ${data.length} bytes`);
    
    let modifiedData = Buffer.from(data);

    // 👽 Kit Unlock Logic මෙතනට පස්සේ දාමු
    // උදාහරණ: 
    // if (data.includes(oldID)) { ... }

    // දත්ත ආපහු ගේම් එකට යවනවා
    socket.write(modifiedData);
};
