import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';

@Injectable()
export class AppService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getHealth(): Promise<object> {
    const memUsage = process.memoryUsage();
    let dbStatus = 'unknown';
    let dbError = null;

    try {
      // Test database connection
      await this.connection.query('SELECT 1');
      dbStatus = 'connected';
    } catch (error) {
      dbStatus = 'disconnected';
      dbError = error.message;
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: dbStatus,
        error: dbError,
      },
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
        external: Math.round(memUsage.external / 1024 / 1024) + ' MB',
      },
      version: process.version,
    };
  }
}
