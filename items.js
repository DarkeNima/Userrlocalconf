// items.js

const items = {
    "sakura_bundle": {
        oldID: "534141443132", 
        newID: "414142423333" 
    }
};

// Naviya Server Alert Packet (Hex format)
// මේක FF ලොබි එකේදී Alert එකක් විදිහට පෙන්නන්න හදපු එකක්
function sendNaviyaAlert(socket) {
    const message = "Naviya Server Logged Successfully! 🚀";
    
    // මේක FF වලට අදාළ string packet එකක් විදිහට convert කරන එක (simplified example)
    const msgBuffer = Buffer.from(message, 'utf-8');
    const header = Buffer.from([0x00, msgBuffer.length]); // Header එකක් විදිහට
    const finalPacket = Buffer.concat([header, msgBuffer]);

    socket.write(finalPacket);
    console.log("📢 Naviya Alert Sent to Client!");
}

function injectKits(data, socket) {
    let hexData = data.toString('hex');
    let modified = false;

    // 1. Kit Injection
    for (let key in items) {
        const item = items[key];
        if (hexData.includes(item.oldID)) {
            hexData = hexData.replace(new RegExp(item.oldID, 'g'), item.newID);
            console.log(`💎 Kit Injected: ${key}`);
            modified = true;
        }
    }

    // 2. Alert Injection
    // ගේම් එක TCP එකට කනෙක්ට් වෙලා එවන මුල්ම පැකට් එකේදී ඇලර්ට් එක යවනවා
    // අපි බලමු පැකට් එකේ මුල "0a" වගේ ලොගින් හෙඩර් එකක් තියෙනවද කියලා
    if (hexData.startsWith("0a")) { 
        sendNaviyaAlert(socket);
    }

    return modified ? Buffer.from(hexData, 'hex') : data;
}

module.exports = { injectKits };
