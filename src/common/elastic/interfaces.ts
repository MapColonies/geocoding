import { ClientOptions } from '@elastic/elasticsearch';
import { type vectorGeocodingV1Type } from '@map-colonies/schemas';

export type ElasticDbClientsConfig = vectorGeocodingV1Type['db']['elastic'];

export type ElasticControlClientConfig = ElasticDbClientsConfig['control'] & ClientOptions;

export type ElasticGeotextClientConfig = ElasticDbClientsConfig['geotext'] & ClientOptions;

// export type ElasticClientBase = {
//   node: string;
//   auth: {
//     username: string;
//     password: string;
//   };
//   properties: {
//     index: string | Record<string, string>;
//     textTermLanguage: string;
//     defaultResponseLimit?: number;
//   };
// };

// export type ElasticDbClientsConfig = {
//   [key in 'control' | 'geotext']: ElasticClientBase & ClientOptions;
// };

// export type ElasticDbClientsConfig = {
//   [key in 'control' | 'geotext']: ClientOptions & {
//     properties: {
//       index:
//         | string
//         | {
//             [key: string]: string;
//           };
//       defaultResponseLimit: number;
//       textTermLanguage: string;
//     };
