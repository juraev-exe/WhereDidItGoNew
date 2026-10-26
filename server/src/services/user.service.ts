import {
  userModel,
  toSafeUser,
  type SafeUser,
  type UpdateUserInput,
} from '../models/user.model.js';
import { hashPassword } from '../utils/password.js';
import { AppError } from '../utils/appError.js';
import { logger } from '../utils/logger.js';

export interface CreateUserParams {
  email: string;
  name: string;
  password?: string;
  role?: 'user' | 'admin';
}

export class UserService {
  async getUserById(id: string): Promise<SafeUser> {
    const user = await userModel.findById(id);
    if (!user) {
      throw new AppError(`User with ID '${id}' not found`, 404);
    }
    return toSafeUser(user);
  }

  async createUser(input: CreateUserParams): Promise<SafeUser> {
    const existing = await userModel.findByEmail(input.email);
    if (existing) {
      throw new AppError(`Email '${input.email}' is already registered`, 409);
    }

    const passwordHash = await hashPassword(input.password || 'TemporaryPass123!');

    const created = await userModel.create({
      email: input.email,
      name: input.name,
      passwordHash,
      role: input.role || 'user',
    });

    logger.info(`👤 New user created: ${created.id} (${created.email})`);
    return toSafeUser(created);
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<SafeUser> {
    // Ensure user exists first
    await this.getUserById(id);

    const updated = await userModel.update(id, input);
    if (!updated) {
      throw new AppError(`Failed to update user '${id}'`, 500);
    }
    return toSafeUser(updated);
  }

  async deleteUser(id: string): Promise<void> {
    await this.getUserById(id);
    const deleted = await userModel.delete(id);
    if (!deleted) {
      throw new AppError(`Failed to delete user '${id}'`, 500);
    }
    logger.info(`🗑️ User deleted: ${id}`);
  }

  async listUsers(): Promise<SafeUser[]> {
    const users = await userModel.list();
    return users.map(toSafeUser);
  }
}

export const userService = new UserService();
