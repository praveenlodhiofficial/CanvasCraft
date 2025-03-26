import express, { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import { UserSchema, RoomSchema } from '@repo/zod/zodTypes';
import { prismaClient } from '@repo/database/prismaClient';
import { config } from '@repo/configuration/config';
import { authMiddleware } from '../middlewares/authMiddleware.js';
const appRouter: Router = express.Router();

// ------------------------------------------------->

// Signup Endpoint
appRouter.post('/signup', async (req, res) => {
    const parsedData = UserSchema.safeParse(req.body);

    if (!parsedData.success) {
        res.status(400).json({
            error: parsedData.error.format(),
            message: 'Incorrect Inputs',
        });
        return;
    }

    try {
        const hashedPassword = await bcrypt.hash(parsedData.data.password, 10);

        const user = await prismaClient.user.create({
            data: {
                username: parsedData.data.username,
                email: parsedData.data.email,
                password: hashedPassword,
            },
        });

        res.status(201).json({
            userId: user.id,
            username: user.username,
            email: user.email,
            message: 'Sign up successful',
        });
    } catch (error) {
        if ((error as any).code === 'P2002') {
            res.status(409).json({
                message: 'Email already exists',
            });
        } else {
            console.error(error);
            res.status(500).json({
                message: 'Internal Server Error',
            });
        }
    }
});

// Signin Endpoint
appRouter.post('/signin', async (req, res) => {
    const parsedData = UserSchema.safeParse(req.body);

    if (!parsedData.success) {
        res.status(400).json({
            error: parsedData.error.format(),
            message: 'Incorrect Inputs',
        });
        return;
    }

    try {
        const user = await prismaClient.user.findFirst({
            where: {
                OR: [
                    { email: parsedData.data.email },
                    { username: parsedData.data.username },
                ],
            },
        });

        if (!user) {
            res.status(401).json({
                message: 'User does not exist in the database',
            });
            return;
        }

        const isPasswordMatched = await bcrypt.compare(parsedData.data.password, user.password);

        if (!isPasswordMatched) {
            res.status(401).json({
                message: 'Incorrect Password',
            });
            return;
        }

        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
            },
            config.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(200).json({
            token,
            userId: user.id,
            username: user.username,
            email: user.email,
            message: 'Sign in successful',
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Internal Server Error',
        });
    }
});

// Room Creation Endpoint
appRouter.post('/room', authMiddleware, async (req, res) => {
    const parsedData = RoomSchema.safeParse(req.body);

    if (!parsedData.success) {
        res.status(400).json({
            error: parsedData.error.format(),
            message: 'Incorrect Inputs',
        });
        return;
    }

    const baseSlug = parsedData.data.name
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

    // @ts-ignore
    const userId = req.userId; // Assuming this is set by auth middleware

    try {
        const existingRoom = await prismaClient.room.findFirst({
            where: { slug: baseSlug },
        });

        if (existingRoom) {
            res.status(409).json({
                message: 'Room with this slug already exists',
            });
            return;
        }

        const room = await prismaClient.room.create({
            data: {
                name: parsedData.data.name,
                slug: baseSlug,
                adminId: userId,
            },
        });

        res.status(201).json({
            message: 'Room created successfully',
            room,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Internal Server Error',
        });
    }
});

// Retrieves room details by its slug
appRouter.get('/room/:slug', authMiddleware, async (req, res) => {
    try {
        const slug = req.params.slug;
        
        const room = await prismaClient.room.findFirst({
            where: {
                slug,
            },
            include: {
                admin: {
                    select: {
                        id: true,
                        username: true,
                    },
                },
            },
        });

        if (!room) {
            res.status(404).json({
                success: false,
                message: 'Room not found',
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: room,
            message: 'Room retrieved successfully',
        });

    } catch (error) {
        console.error('Error fetching room:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: (error as any).message,
        });
    }
});

// Retrieves all drawing elements for a specific room
appRouter.get('/drawings/:roomId', authMiddleware, async (req, res) => {
    try {
        // Validate and parse roomId
        const roomId = Number(req.params.roomId);
        
        if (isNaN(roomId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid room ID',
            });
            return;
        }

        // Check if room exists
        const room = await prismaClient.room.findUnique({
            where: { id: roomId },
        });

        if (!room) {
            res.status(404).json({
                success: false,
                message: 'Room not found',
            });
            return;
        }

        // Get drawing elements
        const drawingElements = await prismaClient.drawingElement.findMany({
            where: {
                roomId: roomId,
            },
            orderBy: {
                updatedAt: 'desc', // Most recently updated first
            },
            take: 1000, // Limit to prevent overload
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                    },
                },
            },
        });

        res.status(200).json({
            success: true,
            data: {
                roomId,
                elements: drawingElements,
                count: drawingElements.length,
            },
            message: 'Drawing elements retrieved successfully',
        });

    } catch (error) {
        console.error('Error fetching drawing elements:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: (error as any).message,
        });
    }
});

// ------------------------------------------------->

export { appRouter };
