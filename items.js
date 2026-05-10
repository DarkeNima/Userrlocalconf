// items.js

const items = {
    // උදාහරණයක් විදිහට පරණ ඇඳුමක ID එකක් සහ අලුත් එකක්
    // මෙතන IDs ඔයා sniff කරලා හොයාගන්න ඕනේ
    "sakura_bundle": {
        oldID: "534141443132", // දැනට තියෙන item hex
        newID: "414142423333"  // Sakura bundle hex
    },
    "hiphop_bundle": {
        oldID: "616263313233",
        newID: "78797a393837"
    }
};

/**
 * පැකට් එක ඇතුලේ තියෙන අයිතමයක් වෙනස් කරන ෆන්ක්ෂන් එක
 */
function injectKits(data) {
    let hexData = data.toString('hex');
    let modified = false;

    for (let key in items) {
        const item = items[key];
        if (hexData.includes(item.oldID)) {
            hexData = hexData.replace(new RegExp(item.oldID, 'g'), item.newID);
            console.log(`💎 Kit Injected: ${key}`);
            modified = true;
        }
    }

    return modified ? Buffer.from(hexData, 'hex') : data;
}

module.exports = { injectKits };
