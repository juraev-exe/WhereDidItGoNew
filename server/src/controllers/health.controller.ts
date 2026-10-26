import type { Request, Response } from 'express';
import { sendSuccess } from '../utils/apiResponse.js';

export class HealthController {
  check(_req: Request, res: Response): void {
    const healthData = {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
    };
    sendSuccess(res, healthData, 'System is healthy');
  }
}

export const healthController = new HealthController();
