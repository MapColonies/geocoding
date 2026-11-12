import { estypes } from '@elastic/elasticsearch';
import { FactoryFunction } from 'tsyringe';
import { ConfigType } from '@src/common/config';
import { ElasticClient, ElasticClients } from '../../common/elastic';
import { queryElastic } from '../../common/elastic/utils';
import { SERVICES } from '../../common/constants';
import { CommonSpanAttributes, withSpan } from '../../common/tracing';
import { additionalControlSearchProperties } from '../../control/utils';
import type { Item } from '../../control/item/models/item';
import type { Tile } from '../../control/tile/models/tile';
import type { Route } from '../../control/route/models/route';
import type { CommonRequestParameters } from '../../common/interfaces';
import type { ConvertSnakeToCamelCase } from '../../common/utils';
import { SmartQuerySpanName, SmartQueryAttributes } from '../tracing';
import type { QueryIntent } from '../interfaces';
import { queryForControlAnyType } from './queries';

/** Any control object kind; `formatResponse` already switches on `properties.TYPE`. */
type ControlObject = Tile | Item | Route;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const createSmartQueryRepository = (client: ElasticClient, config: ConfigType) => {
  return {
    /** Every control object kind in one call, rather than one request per endpoint. */
    async searchControl(
      params: ConvertSnakeToCamelCase<CommonRequestParameters> & { intents: QueryIntent[] }
    ): Promise<estypes.SearchResponse<ControlObject>> {
      return withSpan(
        SmartQuerySpanName.REPOSITORY_SEARCH_CONTROL,
        {
          attributes: {
            [SmartQueryAttributes.INTENTS]: params.intents.map((intent) => intent.kind),
            [CommonSpanAttributes.ELASTIC_INDEX]: config.get('db.elastic.control').index,
          },
        },
        async (span) => {
          const response = await queryElastic<ControlObject>(client, {
            ...additionalControlSearchProperties(config, params.limit),
            ...queryForControlAnyType(params),
          });

          span?.setAttributes({
            [CommonSpanAttributes.RESULT_COUNT]: response.hits.hits.length,
            [CommonSpanAttributes.MATCH_LATENCY_MS]: response.took,
          });

          return response;
        }
      );
    },
  };
};

export type SmartQueryRepository = ReturnType<typeof createSmartQueryRepository>;

export const smartQueryRepositoryFactory: FactoryFunction<SmartQueryRepository> = (depContainer) => {
  return createSmartQueryRepository(
    depContainer.resolve<ElasticClients>(SERVICES.ELASTIC_CLIENTS).control,
    depContainer.resolve<ConfigType>(SERVICES.CONFIG)
  );
};

export const SMART_QUERY_REPOSITORY_SYMBOL = Symbol('SMART_QUERY_REPOSITORY_SYMBOL');
export type { ControlObject };
