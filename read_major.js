const fs = require('fs');

const FILE_NAME = 'captured_login.bin';

try {
    const buffer = fs.readFileSync(FILE_NAME);
    console.log(`\n📂 Reading: ${FILE_NAME} (${buffer.length} bytes)\n`);

    // පේළියකට bytes 16 බැගින් පෙන්වමු
    for (let i = 0; i < buffer.length; i += 16) {
        const chunk = buffer.slice(i, i + 16);
        
        // 1. Hex කොටස (උදා: 4a 57 54)
        const hex = chunk.toString('hex').match(/.{1,2}/g).join(' ');
        
        // 2. Readable ටෙක්ස්ට් කොටස (අකුරු විතරක්)
        const text = chunk.toString('ascii').replace(/[^\x20-\x7E]/g, '.');
        
        // ලස්සනට පේළිය හදමු
        const offset = i.toString(16).padStart(4, '0');
        console.log(`${offset}: ${hex.padEnd(48)} | ${text}`);
    }

} catch (err) {
    console.error("❌ ෆයිල් එක කියවන්න බැහැ:", err.message);
}
