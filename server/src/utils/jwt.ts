import crypto from 'node:crypto';
import { config } from '../config/env.js';
import { AppError } from './appError.js';

export interface TokenPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin';
}

interface JwtHeader {
  alg: 'HS256';
  typ: 'JWT';
}

interface FullJwtPayload extends TokenPayload {
  iat: number;
  exp: number;
}

function parseDuration(durationStr: string): number {
  const match = durationStr.match(/^(\d+)([smhd])$/);
  if (!match) return 900; // default 15 minutes

  const value = parseInt(match[1]!, 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 3600;
    case 'd':
      return value * 86400;
    default:
      return 900;
  }
}

function signJwt(payload: TokenPayload, secret: string, durationStr: string): string {
  const header: JwtHeader = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const exp = now + parseDuration(durationStr);

  const fullPayload: FullJwtPayload = {
    ...payload,
    iat: now,
    exp,
  };

  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const dataToSign = `${headerB64}.${payloadB64}`;

  const signature = crypto
    .createHmac('sha256', secret)
    .update(dataToSign)
    .digest('base64url');

  return `${dataToSign}.${signature}`;
}

function verifyJwt(token: string, secret: string, tokenType = 'Access'): TokenPayload {
  if (!token || typeof token !== 'string') {
    throw new AppError(`Invalid ${tokenType.toLowerCase()} token format`, 401);
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new AppError(`Malformed ${tokenType.toLowerCase()} token`, 401);
  }

  const [headerB64, payloadB64, signature] = parts;
  if (!headerB64 || !payloadB64 || !signature) {
    throw new AppError(`Malformed ${tokenType.toLowerCase()} token`, 401);
  }

  const dataToSign = `${headerB64}.${payloadB64}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(dataToSign)
    .digest('base64url');

  const sigBuffer = Buffer.from(signature);
  const expectedSigBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expectedSigBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedSigBuffer)) {
    throw new AppError(`Invalid ${tokenType.toLowerCase()} token signature`, 401);
  }

  let fullPayload: FullJwtPayload;
  try {
    fullPayload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    throw new AppError(`Corrupted ${tokenType.toLowerCase()} token payload`, 401);
  }

  const now = Math.floor(Date.now() / 1000);
  if (fullPayload.exp && fullPayload.exp < now) {
    throw new AppError(`${tokenType} token has expired`, 401);
  }

  return {
    userId: fullPayload.userId,
    email: fullPayload.email,
    role: fullPayload.role,
  };
}

export function signAccessToken(payload: TokenPayload): string {
  return signJwt(payload, config.JWT_ACCESS_SECRET, config.JWT_ACCESS_EXPIRES_IN);
}

export function signRefreshToken(payload: TokenPayload): string {
  return signJwt(payload, config.JWT_REFRESH_SECRET, config.JWT_REFRESH_EXPIRES_IN);
}

export function verifyAccessToken(token: string): TokenPayload {
  return verifyJwt(token, config.JWT_ACCESS_SECRET, 'Access');
}

export function verifyRefreshToken(token: string): TokenPayload {
  return verifyJwt(token, config.JWT_REFRESH_SECRET, 'Refresh');
}
