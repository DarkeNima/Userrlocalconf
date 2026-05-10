const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const net = require('net');
const protobuf = require('protobufjs');

// Modules import කිරීම
const { handleVerReq } = require('./ver');
const { handleLoginReq } = require('./login');
const { injectKits } = require('./items');

const app = express();
const MY_DOMAIN = 'navivpn.sytes.net';
const TCP_PORT = 7006;
const GARENA_IP = '34.126.76.45'; // Binary එකේ තිබුණ IPs වලින් එකක්

// මුළු Protobuf Schema එකම මෙතන තියෙන්න ඕනේ
const root = protobuf.Root.fromJSON({
    nested: {
        MajorLoginResponse: {
            fields: {
                field1: { type: "uint64", id: 1 }, field2: { type: "string", id: 2 },
                field3: { type: "string", id: 3 }, field4: { type: "string", id: 4 },
                field5: { type: "string", id: 5 }, field8: { type: "string", id: 8 },
                field9: { type: "uint32", id: 9 }, field10: { type: "string", id: 10 },
                field15: { type: "Field15Msg", id: 15 }, field16: { type: "string", id: 16 },
                field19: { type: "string", id: 19 }, field21: { type: "uint32", id: 21 },
                field22: { type: "bytes", id: 22 }, field23: { type: "bytes", id: 23 },
                field24: { type: "string", id: 24 }, field25: { type: "Field25Msg", id: 25 }
            }
        },
        Field15Msg: { fields: { sub1: { type: "uint32", id: 1 } } },
        Field25Msg: { fields: { sub1: { type: "string", id: 1 }, sub2: { type: "uint32", id: 2 }, sub5: { type: "uint32", id: 5 }, sub6: { type: "uint32", id: 6 }, sub7: { type: "uint32", id: 7 } } }
    }
});
const LoginResponseMsg = root.lookupType("MajorLoginResponse");

// SSL
const sslOptions = {
    key: fs.readFileSync(`/etc/letsencrypt/live/${MY_DOMAIN}/privkey.pem`),
    cert: fs.readFileSync(`/etc/letsencrypt/live/${MY_DOMAIN}/fullchain.pem`)
};

app.use((req, res, next) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => { req.rawBody = Buffer.concat(chunks); next(); });
});

// Routes
app.get('/ver.php', handleVerReq);
app.post('/MajorLogin', (req, res) => handleLoginReq(req, res, LoginResponseMsg));

// TCP Bridge (Garena එකත් එක්ක දත්ත හුවමාරුව)
const tcpServer = net.createServer((clientSocket) => {
    console.log(`\n🔥 Client connected: ${clientSocket.remoteAddress}`);
    
    const garenaSocket = net.connect(7006, GARENA_IP, () => {
        console.log("🔗 Connected to Garena Official Server");
    });

    clientSocket.on('data', (data) => {
        let modified = injectKits(data, clientSocket);
        garenaSocket.write(modified);
    });

    garenaSocket.on('data', (data) => {
        let modified = injectKits(data, clientSocket);
        clientSocket.write(modified);
    });

    clientSocket.on('close', () => garenaSocket.end());
    garenaSocket.on('close', () => clientSocket.end());
    clientSocket.on('error', (e) => console.log("Client Socket Error:", e.message));
    garenaSocket.on('error', (e) => console.log("Garena Socket Error:", e.message));
});

tcpServer.listen(TCP_PORT, '0.0.0.0');
http.createServer(app).listen(80);
https.createServer(sslOptions, app).listen(443, () => console.log("🚀 Server is live with full config!"));
