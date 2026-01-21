import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class MigrationService implements OnModuleInit {
  private readonly logger = new Logger(MigrationService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    await this.runMigrations();
  }

  private async runMigrations() {
    try {
      // Check if metadata column exists
      const result = await this.dataSource.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'metadata'
      `);

      if (result.length === 0) {
        this.logger.log('🔧 Adding metadata column to orders table...');
        
        await this.dataSource.query(`
          ALTER TABLE orders ADD COLUMN metadata JSONB
        `);

        await this.dataSource.query(`
          CREATE INDEX IF NOT EXISTS idx_orders_metadata ON orders USING GIN (metadata)
        `);

        this.logger.log('✅ Metadata column added successfully!');
      } else {
        this.logger.log('✅ Metadata column already exists, skipping migration');
      }
    } catch (error) {
      this.logger.error(`❌ Migration failed: ${error.message}`);
      // Don't throw - allow app to start even if migration fails
    }
  }
}
