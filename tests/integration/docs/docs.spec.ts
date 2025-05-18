import jsLogger from '@map-colonies/js-logger';
import { trace } from '@opentelemetry/api';
import httpStatusCodes from 'http-status-codes';
import { CleanupRegistry } from '@map-colonies/cleanup-registry';
import { DependencyContainer } from 'tsyringe';
import { getApp } from '../../../src/app';
import { SERVICES } from '../../../src/common/constants';
import { S3_REPOSITORY_SYMBOL } from '../../../src/common/s3/s3Repository';
import { cronLoadTileLatLonDataSymbol } from '../../../src/latLon/DAL/latLonDAL';
import { DocsRequestSender } from './helpers/docsRequestSender';

describe('docs', function () {
  let depContainer: DependencyContainer;
  let requestSender: DocsRequestSender;

  beforeEach(async function () {
    const { app, container } = await getApp({
      override: [
        { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
        { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
        { token: S3_REPOSITORY_SYMBOL, provider: { useValue: {} } },
        { token: SERVICES.S3_CLIENT, provider: { useValue: {} } },
        { token: cronLoadTileLatLonDataSymbol, provider: { useValue: {} } },
        { token: SERVICES.REDIS, provider: { useValue: {} } },
      ],
      useChild: true,
    });
    requestSender = new DocsRequestSender(app);
    depContainer = container;
  });

  beforeEach(function () {
    jest.resetAllMocks();
  });

  afterAll(async function () {
    const registry = depContainer.resolve<CleanupRegistry>(SERVICES.CLEANUP_REGISTRY);
    await registry.trigger();
    depContainer.reset();
  });

  describe('Happy Path', function () {
    it('should return 200 status code and the resource', async function () {
      const response = await requestSender.getDocs();

      expect(response.status).toBe(httpStatusCodes.OK);
      expect(response.type).toBe('text/html');
    });

    it('should return 200 status code and the json spec', async function () {
      const response = await requestSender.getDocsJson();

      expect(response.status).toBe(httpStatusCodes.OK);

      expect(response.type).toBe('application/json');
      expect(response.body).toHaveProperty('openapi');
    });
  });
});
