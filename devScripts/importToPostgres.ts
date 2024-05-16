import { DataSource } from 'typeorm';
import { createConnectionOptions } from '../src/common/postgresql';
import config from '../config/test.json';
import { PostgresDbConfig } from '../src/common/interfaces';

export default async function createDatabaseClient(): Promise<void> {
  const connectionOptions = config.db.postgresql as PostgresDbConfig;
  const connection = new DataSource({
    ...createConnectionOptions(connectionOptions),
  });

  await connection.initialize();

  await connection.query(`CREATE SCHEMA IF NOT EXISTS ${config.db.postgresql.schema};`);

  await connection.query(`
        CREATE TABLE IF NOT EXISTS ${config.db.postgresql.schema}.tile_lat_lon
        (
            pk integer NOT NULL,
            tile_name text COLLATE pg_catalog."default",
            zone text COLLATE pg_catalog."default",
            min_x text COLLATE pg_catalog."default",
            min_y text COLLATE pg_catalog."default",
            ext_min_x integer,
            ext_min_y integer,
            ext_max_x integer,
            ext_max_y integer,
            CONSTRAINT tile_lat_lon_pkey PRIMARY KEY (pk)
        )
    `);

  await connection.query(`
    INSERT INTO ${config.db.postgresql.schema}.tile_lat_lon(
            pk, tile_name, zone, min_x, min_y, ext_min_x, ext_min_y, ext_max_x, ext_max_y)
            VALUES (1, 'BRN', '33', '360000', '5820000', 360000, 5820000, 370000, 5830000);
    `);

  await connection.query(`
    INSERT INTO ${config.db.postgresql.schema}.tile_lat_lon(
        pk, tile_name, zone, min_x, min_y, ext_min_x, ext_min_y, ext_max_x, ext_max_y)
        VALUES (2, 'BMN', '32', '480000', '5880000', 480000, 5880000, 490000, 5890000);
    `);

  console.log('PGSQL: Table created and data inserted');

  await connection.destroy();
}
