import { WebSocketServer } from "ws";
import { WS_SERVER_PORT } from "@repo/configuration/config";
const wss = new WebSocketServer({ port: WS_SERVER_PORT });

wss.on("connection", (ws) => {

    ws.on("message", (message) => {
        ws.send(message);
        console.log(`Received message: ${message}`);
    })
});