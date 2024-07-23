import { readPackageJsonSync } from '@map-colonies/read-pkg';

export const SERVICE_NAME = readPackageJsonSync().name ?? 'unknown_service';
export const DEFAULT_SERVER_PORT = 80;

export const IGNORED_OUTGOING_TRACE_ROUTES = [/^.*\/v1\/metrics.*$/];
export const IGNORED_INCOMING_TRACE_ROUTES = [/^.*\/docs.*$/];

/* eslint-disable @typescript-eslint/naming-convention */
export const SERVICES: Record<string, symbol> = {
  LOGGER: Symbol('Logger'),
  CONFIG: Symbol('Config'),
  TRACER: Symbol('Tracer'),
  METER: Symbol('Meter'),
  APPLICATION: Symbol('Application'),
};
/* eslint-enable @typescript-eslint/naming-convention */

export const ON_SIGNAL = Symbol('onSignal');
export const HEALTHCHECK = Symbol('healthcheck');

export const FIELDS = [
  'type',
  'geometry',
  'properties.OBJECT_COMMAND_NAME',
  'properties.TILE_NAME',
  'properties.TYPE',
  'properties.ENTITY_HEB',
  'properties.SUB_TILE_ID',
  'properties.SECTION',
];

export const elasticConfigPath = 'db.elastic';
