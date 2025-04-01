import jwt from 'jsonwebtoken';
import { WebSocketServer, WebSocket } from 'ws';
import { config } from '@repo/configuration/config';
import { prismaClient } from '@repo/database/prismaClient';

interface User {
    userId: string;
    rooms: number[]; // Changed t o number[] to match Room.id type
    ws: WebSocket;
}

const wss = new WebSocketServer({ port: config.WS_SERVER_PORT });
const users: User[] = []; // Array to manage user state

function checkUser(token: string): string | null {
    try {
        const decoded = jwt.verify(token, config.JWT_SECRET);

        if (typeof decoded === 'string' || !decoded || !decoded.userId) {
            return null;
        }

        return decoded.userId;
    } catch (error) {
        console.error('JWT verification failed:', error);
        return null;
    }
}

wss.on('connection', (ws, request) => {
    try {
        const url = request.url;

        if (!url) {
            ws.close(1003, 'No URL provided');
            return;
        }

        const queryParams = new URLSearchParams(url.split('?')[1]);
        const token = queryParams.get('token') || '';
        const userId = checkUser(token);

        if (userId === null) {
            ws.close(1003, 'User not authenticated');
            return;
        }

        // Add the user to the users array
        users.push({
            userId,
            ws,
            rooms: [],
        });

        console.log(`User connected: ${userId}`);

        ws.on('message', async (data) => {
            try {
                let parsedData;
                if (typeof data !== 'string') {
                    parsedData = JSON.parse(data.toString());
                } else {
                    parsedData = JSON.parse(data);
                }

                // Handle joining a room
                if (parsedData.type === 'join_room') {
                    const roomId = Number(parsedData.roomId);
                    const user = users.find((x) => x.ws === ws);

                    if (!user) return;

                    // Verify room exists
                    const room = await prismaClient.room.findUnique({
                        where: { id: roomId },
                    });

                    if (!room) {
                        ws.send(JSON.stringify({ error: 'Room not found' }));
                        return;
                    }

                    if (!user.rooms.includes(roomId)) {
                        user.rooms.push(roomId);
                        console.log(`User ${user.userId} joined room: ${roomId}`);
                        ws.send(JSON.stringify({
                            type: 'join_room_success',
                            roomId,
                            message: `Joined room ${roomId}`,
                        }));
                    }
                }

                // Handle leaving a room
                if (parsedData.type === 'leave_room') {
                    const roomId = Number(parsedData.roomId);
                    const user = users.find((x) => x.ws === ws);

                    if (user) {
                        user.rooms = user.rooms.filter((id) => id !== roomId);
                        console.log(`User ${user.userId} left room: ${roomId}`);
                        ws.send(JSON.stringify({
                            type: 'leave_room_success',
                            roomId,
                            message: `Left room ${roomId}`,
                        }));
                    }
                }

                // Handle drawing element updates
                if (parsedData.type === 'drawing') {
                    const { roomId, element } = parsedData;
                    const numericRoomId = Number(roomId);

                    // Validate roomId and element data
                    if (!numericRoomId || !element || !element.type || !element.properties) {
                        ws.send(JSON.stringify({ error: 'Invalid drawing data' }));
                        return;
                    }

                    // Save the drawing element to the database
                    const newElement = await prismaClient.drawingElement.create({
                        data: {
                            type: element.type, // Should match ElementType enum (CIRCLE, PENCIL, etc.)
                            properties: element.properties, // JSON object
                            userId,
                            roomId: numericRoomId,
                        },
                    });

                    console.log(`Drawing element added in room ${numericRoomId} by user ${userId}`);

                    // Broadcast to all users in the room
                    users.forEach((user) => {
                        if (user.rooms.includes(numericRoomId)) {
                            user.ws.send(
                                JSON.stringify({
                                    type: 'drawing',
                                    roomId: numericRoomId,
                                    element: {
                                        id: newElement.id,
                                        type: newElement.type,
                                        properties: newElement.properties,
                                        userId: newElement.userId,
                                        createdAt: newElement.createdAt,
                                        updatedAt: newElement.updatedAt,
                                    },
                                })
                            );
                            console.log(`Drawing sent to user ${user.userId} in room ${numericRoomId}`);
                        }
                    });
                }
            } catch (messageError) {
                console.error('Error processing message:', messageError);
                ws.send(JSON.stringify({ error: 'Invalid message format or data' }));
            }
        });

        ws.on('close', () => {
            // Remove the user from the users array on disconnection
            const userIndex = users.findIndex((user) => user.ws === ws);
            if (userIndex !== -1) {
                console.log(`User disconnected: ${users[userIndex]?.userId}`);
                users.splice(userIndex, 1);
            }
        });

        // Notify the client of a successful connection
        ws.send(JSON.stringify({
            type: 'connection',
            message: 'Connection established',
        }));
    } catch (connectionError) {
        console.error('Error during WebSocket connection:', connectionError);
        ws.close(1011, 'Internal server error');
    }
});

console.log('WebSocket server running on ws://localhost:8080');