import { ClientOptions } from '@elastic/elasticsearch';
import { type vectorGeocodingV1Type } from '@map-colonies/schemas';

export type ElasticDbClientsConfig = vectorGeocodingV1Type['db']['elastic'];

export type ElasticControlClientConfig = ElasticDbClientsConfig['control'] & ClientOptions;

export type ElasticGeotextClientConfig = ElasticDbClientsConfig['geotext'] & ClientOptions;
