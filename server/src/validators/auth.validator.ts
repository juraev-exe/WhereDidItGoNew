import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    name: z.string().min(2, 'Name must be at least 2 characters long').max(50),
    role: z.enum(['user', 'admin']).optional().default('user'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

export type RegisterInputDto = z.infer<typeof registerSchema>['body'];
export type LoginInputDto = z.infer<typeof loginSchema>['body'];
export type RefreshTokenInputDto = z.infer<typeof refreshTokenSchema>['body'];
