import { WebSocketServer } from "ws";
import { config } from "@repo/configuration/config";

const wss = new WebSocketServer({ port: config.WS_SERVER_PORT});   

wss.on("connection", (ws) => {

    ws.on("message", (message) => {
        ws.send(message);
        console.log(`Received message: ${message}`);
    })
});