export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  passwordHash: string;
  refreshToken?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type SafeUser = Omit<User, 'passwordHash' | 'refreshToken'>;

export type CreateUserInput = {
  email: string;
  name: string;
  passwordHash: string;
  role?: 'user' | 'admin';
};

export type UpdateUserInput = Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>;

export function toSafeUser(user: User): SafeUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, refreshToken, ...safe } = user;
  return safe;
}

/**
 * In-memory repository mock demonstrating database schema interactions.
 * Ready to be swapped with Prisma (`prisma.user`) or Drizzle queries.
 */
class UserModel {
  private users: Map<string, User> = new Map([
    [
      'usr_demo123',
      {
        id: 'usr_demo123',
        email: 'alex@example.com',
        name: 'Alex Developer',
        role: 'user',
        // pre-hashed bcrypt hash for 'Password123!'
        passwordHash: '$2a$10$vK3sYjSGeT66uVl0Y5J8O.h2rO8QkGgEcfY88O5WJ1vI3x3xHw8uC',
        refreshToken: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ],
  ]);

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === email.toLowerCase()) {
        return user;
      }
    }
    return null;
  }

  async create(data: CreateUserInput): Promise<User> {
    const id = `usr_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();
    const newUser: User = {
      id,
      email: data.email,
      name: data.name,
      passwordHash: data.passwordHash,
      role: data.role || 'user',
      refreshToken: null,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(id, newUser);
    return newUser;
  }

  async update(id: string, data: UpdateUserInput): Promise<User | null> {
    const existing = this.users.get(id);
    if (!existing) return null;

    const updated: User = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };
    this.users.set(id, updated);
    return updated;
  }

  async setRefreshToken(id: string, token: string | null): Promise<void> {
    const existing = this.users.get(id);
    if (existing) {
      existing.refreshToken = token;
      existing.updatedAt = new Date();
    }
  }

  async delete(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  async list(): Promise<User[]> {
    return Array.from(this.users.values());
  }
}

export const userModel = new UserModel();
