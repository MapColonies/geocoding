import jsLogger from '@map-colonies/js-logger';
import { trace } from '@opentelemetry/api';
import { SERVICES } from '@src/common/constants';
import { S3_REPOSITORY_SYMBOL } from '@src/common/s3/s3Repository';
import { cronLoadTileLatLonDataSymbol } from '@src/latLon/DAL/latLonDAL';
import { GetBaseRegisterOptions } from '@tests/integration/helpers/types';

export const getBaseRegisterOptions: GetBaseRegisterOptions = (options = []) => {
  return {
    override: [
      { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
      { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
      { token: S3_REPOSITORY_SYMBOL, provider: { useValue: {} } },
      { token: SERVICES.S3_CLIENT, provider: { useValue: {} } },
      { token: cronLoadTileLatLonDataSymbol, provider: { useValue: {} } },
      { token: SERVICES.ELASTIC_CLIENTS, provider: { useValue: {} } },
      ...options,
    ],
    useChild: true,
  };
};
