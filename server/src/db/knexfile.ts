import type { Knex } from 'knex';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../../.env') });

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'pg',
    connection: {
      host: process.env.PGHOST || 'localhost',
      port: Number(process.env.PGPORT) || 5432,
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD ?? 'postgres',
      database: process.env.PGDATABASE || 'moneysplit'
    },
    migrations: {
      directory: path.join(__dirname, 'migrations'),
      extension: 'ts'
    },
    seeds: {
      directory: path.join(__dirname, 'seeds')
    }
  }
};

export = config;
