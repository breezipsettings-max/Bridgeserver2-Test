const WebSocket = require('ws');
const http = require('http');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 8080;

app.get('/', (req, res) => res.send('Bridge Online'));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// WebSocket Server Message Handler
ws.on('message', (message) => {
    const msg = message.toString();

    // 1. Handle JOIN: Register the player to a room based on their Roblox Server JobId
    if (msg.startsWith("JOIN:")) {
        const parts = msg.split(":");
        ws.room = parts[1];
        ws.playerName = parts[2] || "Unknown";
        console.log(`[SERVER] ${ws.playerName} joined lobby: ${ws.room}`);

        const connectMsg = JSON.stringify({
            Type: "SYSTEM_NOTIFICATION",
            Message: `${ws.playerName} has connected to the relay server.`
        });

        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN && client.room === ws.room) {
                client.send(connectMsg);
            }
        });
        return;
    }

    // 2. Morph Data Broadcast Logic
    try {
        if (msg.startsWith("{")) {
            const parsed = JSON.parse(msg);
            if (parsed.PlayerName && parsed.MorphSettings) {
                console.log(`[SERVER] Echoing update for ${parsed.PlayerName} in room ${ws.room}`);
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN && client.room === ws.room) {
                        client.send(msg);
                    }
                });
                return;
            }
        }
    } catch (e) {
        console.log("[SERVER] Error processing JSON:", e);
    }
});
server.listen(PORT, () => console.log(`Bridge running on ${PORT}`));
