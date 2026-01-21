// // database.service.ts
// import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
// import { Pool } from 'pg';

// @Injectable()
// export class DatabaseService implements OnModuleInit, OnModuleDestroy {
//   private pool: Pool;

//   constructor() {
//     this.pool = new Pool({
//       host: 'localhost',
//       port: 5432,
//       user: 'postgres',
//       password: 'BYTEBOOM',
//       database: 'ByteBoom',
//     });
//   }

//   async onModuleInit() {
//     await this.pool.connect();
//   }

//   async onModuleDestroy() {
//     await this.pool.end();
//   }

//   getPool(): Pool {
//     return this.pool;
//   }
// }