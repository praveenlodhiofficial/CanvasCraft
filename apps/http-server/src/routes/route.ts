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

// ------------------------------------------------->

export { appRouter };
