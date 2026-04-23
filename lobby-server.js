const net = require('net');

const LOBBY_PORT = 10001; // Free Fire's default lobby port

const server = net.createServer((socket) => {
    console.log(`[${new Date().toISOString()}] Client connected from ${socket.remoteAddress}:${socket.remotePort}`);

    socket.on('data', (data) => {
        console.log(`[${new Date().toISOString()}] Received ${data.length} bytes: ${data.toString('hex')}`);

        // Echo the data back to the client
        socket.write(data);
    });

    socket.on('error', (err) => {
        console.error(`Socket error: ${err.message}`);
    });

    socket.on('close', () => {
        console.log(`[${new Date().toISOString()}] Client disconnected`);
    });
});

server.listen(LOBBY_PORT, '0.0.0.0', () => {
    console.log(`Lobby server listening on port ${LOBBY_PORT}`);
});

server.on('error', (err) => {
    console.error(`Server error: ${err.message}`);
});
