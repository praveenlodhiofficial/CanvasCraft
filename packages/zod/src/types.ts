import { z } from 'zod';

export const UserSchema = z.object({
  username: z.string(),
  email: z.string().email(),
  password: z.string(),
});

export const RoomSchema = z.object({
  name: z.string(),
  adminId: z.string(),
});

export const DrawingElementSchema = z.object({
  properties: z.record(z.any()),
  userId: z.string(),
  roomId: z.number().int(),
});