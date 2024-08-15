import { readFileSync } from 'fs';
import { HealthCheck } from '@godaddy/terminus';
import { DataSource, DataSourceOptions, QueryFailedError } from 'typeorm';
import { DependencyContainer, FactoryFunction } from 'tsyringe';
import { IConfig, PostgresDbConfig } from '../interfaces';
import { LatLon } from '../../latLon/DAL/latLon';
import { SERVICES } from '../constants';
import { promiseTimeout } from './promiseTimeout';

const DB_TIMEOUT = 5000;

enum TransactionFailure {
  SERIALIZATION_FAILURE = '40001',
  DEADLOCK_DETECTED = '40P01',
}

interface QueryFailedErrorWithCode extends QueryFailedError {
  code: string | undefined;
}

export const postgresClientFactory: FactoryFunction<DataSource> = (container: DependencyContainer): DataSource => {
  const config = container.resolve<IConfig>(SERVICES.CONFIG);

  const dbConfig = config.get<PostgresDbConfig>('db.postgresql');
  return new DataSource(createConnectionOptions(dbConfig));
};

export enum TransactionName {
  TRY_CLOSING_FILE = 'TryClosingFile',
  CREATE_RERUN = 'CreateRerun',
  TRY_CLOSING_CHANGESET = 'TryClosingChangeset',
  TRY_CLOSING_CHANGESETS = 'TryClosingChangesets',
}

export const isTransactionFailure = (error: unknown): boolean => {
  if (error instanceof QueryFailedError) {
    const code = (error as QueryFailedErrorWithCode).code;
    return code === TransactionFailure.SERIALIZATION_FAILURE || code === TransactionFailure.DEADLOCK_DETECTED;
  }
  return false;
};

export const DB_ENTITIES = [LatLon];

export const createConnectionOptions = (dbConfig: PostgresDbConfig): DataSourceOptions => {
  const { enableSslAuth, sslPaths, ...connectionOptions } = dbConfig;
  if (enableSslAuth && connectionOptions.type === 'postgres') {
    connectionOptions.password = undefined;
    connectionOptions.ssl = { key: readFileSync(sslPaths.key), cert: readFileSync(sslPaths.cert), ca: readFileSync(sslPaths.ca) };
  }
  return { entities: [...DB_ENTITIES, '**/DAL/*.js'], ...connectionOptions };
};

export const getDbHealthCheckFunction = (connection: DataSource): HealthCheck => {
  return async (): Promise<void> => {
    const check = connection.query('SELECT 1').then(() => {
      return;
    });
    return promiseTimeout<void>(DB_TIMEOUT, check);
  };
};

export interface ReturningId {
  id: string;
}

export type ReturningResult<T> = [T[], number];
