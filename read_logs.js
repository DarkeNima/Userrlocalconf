const fs = require('fs');
const protobuf = require('protobufjs');
const path = require('path');

// අපි කලින් පාවිච්චි කරපු Protobuf Schema එක
const root = protobuf.Root.fromJSON({
    nested: {
        MajorLoginResponse: {
            fields: {
                field1: { type: "uint64", id: 1 },
                field2: { type: "string", id: 2 },
                field3: { type: "string", id: 3 },
                field4: { type: "string", id: 4 },
                field5: { type: "string", id: 5 },
                field8: { type: "string", id: 8 },
                field9: { type: "uint32", id: 9 },
                field10: { type: "string", id: 10 },
                field15: { type: "Field15Msg", id: 15 },
                field16: { type: "string", id: 16 },
                field19: { type: "string", id: 19 },
                field21: { type: "uint32", id: 21 },
                field22: { type: "bytes", id: 22 },
                field23: { type: "bytes", id: 23 },
                field24: { type: "string", id: 24 },
                field25: { type: "Field25Msg", id: 25 }
            }
        },
        Field15Msg: { fields: { sub1: { type: "uint32", id: 1 } } },
        Field25Msg: {
            fields: {
                sub1: { type: "string", id: 1 },
                sub2: { type: "uint32", id: 2 },
                sub5: { type: "uint32", id: 5 },
                sub6: { type: "uint32", id: 6 },
                sub7: { type: "uint32", id: 7 }
            }
        }
    }
});

const LoginResponseMsg = root.lookupType("MajorLoginResponse");

// කියවන්න ඕන File එකේ නම මෙතනට දෙන්න
const FILE_NAME = 'res_1778410647412.bin'; 
const filePath = path.join(__dirname, 'logs', FILE_NAME);

try {
    // 1. .bin file එක කියවීම
    const buffer = fs.readFileSync(filePath);
    
    // 2. Protobuf හරහා Decode කිරීම
    const decoded = LoginResponseMsg.decode(buffer);
    
    // 3. ලස්සනට Print කිරීම
    console.log(`\n✅ Successfully Decoded: ${FILE_NAME}\n`);
    console.log(JSON.stringify(decoded, null, 4));

} catch (err) {
    console.error(`❌ Decode Error:`, err.message);
}
