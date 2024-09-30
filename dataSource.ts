import config from 'config';
import { DataSource } from 'typeorm';
import { createConnectionOptions } from './src/common/postgresql';
import { PostgresDbConfig } from './src/common/interfaces';

const connectionOptions = config.get<PostgresDbConfig>('db.postgresql');

export const appDataSource = new DataSource({
  ...createConnectionOptions(connectionOptions),
  entities: ['src/**/DAL/*.ts'],
  migrationsTableName: 'migrations_table',
  migrations: ['db/migrations/*.ts'],
});
