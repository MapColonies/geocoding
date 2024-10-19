import { ClientOptions } from '@elastic/elasticsearch';

export type ElasticDbClientsConfig = {
  [key in 'control' | 'geotext']: ClientOptions & {
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
