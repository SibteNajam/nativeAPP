import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPerformanceIndexes1736500000000 implements MigrationInterface {
    name = 'AddPerformanceIndexes1736500000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Critical indexes for trade query performance
        // Table: "orders", Columns: user_id, order_role, order_group_id, exchange, symbol, status, created_at
        
        // Index for user_id + order_role filtering (used in getTradesWithPnL)
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_orders_user_id_order_role" 
            ON "orders" ("user_id", "order_role")
        `);

        // Index for order_group_id + order_role (used for finding exit orders)
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_orders_order_group_id_order_role" 
            ON "orders" ("order_group_id", "order_role")
        `);

        // Index for user_id + exchange (commonly used filter combination)
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_orders_user_id_exchange" 
            ON "orders" ("user_id", "exchange")
        `);

        // Index for user_id + symbol (commonly used filter combination)
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_orders_user_id_symbol" 
            ON "orders" ("user_id", "symbol")
        `);

        // Composite index for the full where clause in getTradesWithPnL
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_orders_user_id_exchange_symbol" 
            ON "orders" ("user_id", "exchange", "symbol")
        `);

        // Index for created_at (used for sorting)
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_orders_created_at" 
            ON "orders" ("created_at" DESC)
        `);

        // Composite index for order_group_id lookups with status filtering
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_orders_order_group_id_status" 
            ON "orders" ("order_group_id", "status")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_user_id_order_role"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_order_group_id_order_role"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_user_id_exchange"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_user_id_symbol"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_user_id_exchange_symbol"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_created_at"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_order_group_id_status"`);
    }
}
