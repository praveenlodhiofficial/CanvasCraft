import jwt from 'jsonwebtoken';

import { Request, Response, NextFunction } from 'express';
import { config } from '@repo/configuration/config';

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const token = req.header('Authorization');

    if (!token) {
        res.status(401).json({
            message: 'Authorization token is missing or invalid.',
        });
        return;
    }

    try {
        const decoded = jwt.verify(token, config.JWT_SECRET) as { userId: string };
        if (decoded) {
            // @ts-ignore
            req.userId = decoded.userId;
        }
        next();
        console.log('Token verified successfully');
        
    } catch (error) {
        console.error('JWT verification failed:', error);
        res.status(403).json({
            message: 'User unauthorized. Invalid or expired token.',
        });
    }
};
