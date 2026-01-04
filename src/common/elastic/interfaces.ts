import { ClientOptions } from '@elastic/elasticsearch';
import { type vectorGeocodingV2Type } from '@map-colonies/schemas';

export type ElasticDbClientsConfig = vectorGeocodingV2Type['db']['elastic'];

export type ElasticControlClientConfig = ElasticDbClientsConfig['control'] & ClientOptions;

export type ElasticGeotextClientConfig = ElasticDbClientsConfig['geotext'] & ClientOptions;
