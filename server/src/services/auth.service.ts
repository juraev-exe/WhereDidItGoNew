import { userModel, toSafeUser, type SafeUser } from '../models/user.model.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, type TokenPayload } from '../utils/jwt.js';
import { AppError } from '../utils/appError.js';
import { logger } from '../utils/logger.js';
import type { RegisterInputDto, LoginInputDto } from '../validators/auth.validator.js';

export interface AuthResponse {
  user: SafeUser;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export class AuthService {
  async register(input: RegisterInputDto): Promise<AuthResponse> {
    const existing = await userModel.findByEmail(input.email);
    if (existing) {
      throw new AppError(`Email '${input.email}' is already registered`, 409);
    }

    const passwordHash = await hashPassword(input.password);

    const newUser = await userModel.create({
      email: input.email,
      name: input.name,
      passwordHash,
      role: input.role || 'user',
    });

    const tokenPayload: TokenPayload = {
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    await userModel.setRefreshToken(newUser.id, refreshToken);
    logger.info(`🔐 User registered successfully: ${newUser.id} (${newUser.email})`);

    return {
      user: toSafeUser(newUser),
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  async login(input: LoginInputDto): Promise<AuthResponse> {
    const user = await userModel.findByEmail(input.email);
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isMatch = await comparePassword(input.password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    // Save active refresh token for rotation / revocation verification
    await userModel.setRefreshToken(user.id, refreshToken);
    logger.info(`🔑 User logged in: ${user.id}`);

    return {
      user: toSafeUser(user),
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  async refreshTokens(incomingRefreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = verifyRefreshToken(incomingRefreshToken);

    const user = await userModel.findById(payload.userId);
    if (!user || user.refreshToken !== incomingRefreshToken) {
      throw new AppError('Invalid or revoked refresh token', 401);
    }

    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const newAccessToken = signAccessToken(tokenPayload);
    const newRefreshToken = signRefreshToken(tokenPayload);

    // Rotate refresh token
    await userModel.setRefreshToken(user.id, newRefreshToken);
    logger.info(`🔄 Tokens rotated for user: ${user.id}`);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(userId: string): Promise<void> {
    await userModel.setRefreshToken(userId, null);
    logger.info(`🚪 User logged out: ${userId}`);
  }

  async getCurrentUser(userId: string): Promise<SafeUser> {
    const user = await userModel.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return toSafeUser(user);
  }
}

export const authService = new AuthService();
