import { ClientOptions } from '@elastic/elasticsearch';

export type ElasticDbClientsConfig = {
  [key in 'control' | 'geotext']: ElasticDbConfig & {
    properties: {
      index:
        | string
        | {
            [key: string]: string;
          };
      defaultResponseLimit: number;
      textTermLanguage: string;
    };
  };
};

export type ElasticDbConfig = ClientOptions;
