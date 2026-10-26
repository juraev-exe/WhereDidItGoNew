import { z } from 'zod';

export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email('Please provide a valid email address'),
    name: z.string().min(2, 'Name must be at least 2 characters long').max(50),
    password: z.string().min(8, 'Password must be at least 8 characters long').optional(),
    role: z.enum(['user', 'admin']).default('user'),
  }),
});

export const updateUserSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'User ID is required'),
  }),
  body: z.object({
    name: z.string().min(2).max(50).optional(),
    role: z.enum(['user', 'admin']).optional(),
  }),
});

export const getUserByIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'User ID is required'),
  }),
});

export type CreateUserInputDto = z.infer<typeof createUserSchema>['body'];
export type UpdateUserInputDto = z.infer<typeof updateUserSchema>['body'];
