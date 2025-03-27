import jwt from 'jsonwebtoken'
import WebSocket, { WebSocketServer } from "ws";
import { config } from '@repo/configuration/config'
// import { prismaClient } from '@repo/'

interface User {
    userId: string
    rooms: number[],
    ws: WebSocket
}

const wss = new WebSocketServer({ port: config.WS_SERVER_PORT })
const users: User[] = [];

function cheakUser(token: string): string | null {
    const decoded = jwt.verify(token, config.JWT_SECRET)

    if (typeof decoded === 'string' || !decoded || !decoded.userId) {
        return null
    }

    return decoded.userId;
}

wss.on('connection', (ws, request) => {
    const url = request.url;

    if (!url) {
        ws.close(1003, 'URL not provided')
        return
    }

    const queryParams = new URLSearchParams(url.split('?')[1])
    const token = queryParams.get('token') || ' ';
    const userId = cheakUser(token)

    if (userId === null) {
        ws.close(1003, 'User not Authernticated')
        return
    }

    users.push({
        userId,
        ws,
        rooms: []
    })

    console.log(`User Connected: ${userId}`);

    wss.on('message', async(data) => {
        let parsedData;

        if (typeof data === 'string') {
            parsedData = JSON.parse(data.toString());
        } else {
            parsedData = JSON.parse(data)
        }

        if (parsedData.type === 'join_room') {
            const roomId = Number(parsedData.roomId)
            const user = users.find((x) => x.ws === ws)
        }
    })

})