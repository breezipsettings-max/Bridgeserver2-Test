const WebSocket = require('ws');
const http = require('http');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 8080;

app.get('/', (req, res) => res.send('Bridge Online'));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    ws.room = 'EN';
    ws.playerName = 'Unknown';

    ws.on('message', (data) => {
        const msg = data.toString();

        // Handle JOIN
        if (msg.startsWith("JOIN:")) {
            const parts = msg.split(":");
            ws.room = parts[1];
            ws.playerName = parts[2] || "Unknown";
            console.log(`${ws.playerName} joined: ${ws.room}`);
            return;
        }

        // Handle Online Users Request
        if (msg.startsWith("GET_ONLINE_USERS|")) {
            let onlineNames = [];
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    onlineNames.push(client.playerName || "Unknown");
                }
            });

            // Format matches your Luau: ONLINE_USERS_RESPONSE|Name1, Name2
            const response = "ONLINE_USERS_RESPONSE|" + (onlineNames.length > 0 ? onlineNames.join(", ") : "None");
            ws.send(response);
            return;
        }

        // Broadcast Logic
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN && client.room === ws.room) {
                client.send(msg);
            }
        });

     // Morph Data Broadcast Logic
        try {
            if (msg.startsWith("{")) {
                const parsed = JSON.parse(msg);

                if (parsed.PlayerName && parsed.MorphSettings) {
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN && client.room === ws.room) {
                            client.send(msg);
                        }
                    });

                    return;
                }
            }
        } catch (e) {
            // Silently ignore messages that aren't valid JSON
        }

        // Obsidian Handshake BroadCast Logic
        if (msg.includes("ObsidianHandshake")) {
            try {
                const packet = JSON.parse(msg);
                wss.clients.forEach((client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN && client.room === ws.room) {
                        client.send(JSON.stringify({
                            Type: "ObsidianHandshake",
                            UserId: packet.UserId
                        }));
                    }
                });
            } catch (e) {
                wss.clients.forEach((client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN && client.room === ws.room) {
                        client.send(msg);
                    }
                });
            }
            return;
        }
    });
});

server.listen(PORT, () => console.log(`Bridge running on ${PORT}`));
