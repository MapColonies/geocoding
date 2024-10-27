/* eslint-disable @typescript-eslint/naming-convention */
import 'jest-openapi';
import { DependencyContainer } from 'tsyringe';
import { Application } from 'express';
import { CleanupRegistry } from '@map-colonies/cleanup-registry';
import jsLogger from '@map-colonies/js-logger';
import { trace } from '@opentelemetry/api';
import httpStatusCodes from 'http-status-codes';
import { getApp } from '../../../src/app';
import { SERVICES } from '../../../src/common/constants';
import { cronLoadTileLatLonDataSymbol, LatLonDAL, latLonDalSymbol, latLonSignletonFactory } from '../../../src/latLon/DAL/latLonDAL';
import { LatLon } from '../../../src/latLon/models/latLon';
import { ConvertCamelToSnakeCase } from '../../../src/common/utils';
import { ConfigRequestSender } from './helpers/requestSender';

describe('/config/control/table', function () {
  let requestSender: ConfigRequestSender;
  let app: { app: Application; container: DependencyContainer };

  beforeEach(async function () {
    app = await getApp({
      override: [
        { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
        { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
        { token: cronLoadTileLatLonDataSymbol, provider: { useValue: {} } },
        { token: SERVICES.ELASTIC_CLIENTS, provider: { useValue: {} } },
        { token: latLonDalSymbol, provider: { useFactory: latLonSignletonFactory } },
      ],
      useChild: true,
    });

    requestSender = new ConfigRequestSender(app.app);
  });

  afterAll(async function () {
    const cleanupRegistry = app.container.resolve<CleanupRegistry>(SERVICES.CLEANUP_REGISTRY);
    await cleanupRegistry.trigger();
    app.container.reset();

    jest.clearAllTimers();
  });

  describe('Happy Path', function () {
    it('should return 200 status code and Control Grid table', async function () {
      const response = await requestSender.getControlTable();

      expect(response.status).toBe(httpStatusCodes.OK);
      expect(response).toSatisfyApiSpec();
      expect(response.body).toEqual<Record<string, ConvertCamelToSnakeCase<LatLon>>>({
        '360000,5820000,33': {
          tile_name: 'BRN',
          zone: '33',
          min_x: '360000',
          min_y: '5820000',
          ext_min_x: 360000,
          ext_min_y: 5820000,
          ext_max_x: 370000,
          ext_max_y: 5830000,
        },
        '480000,5880000,32': {
          tile_name: 'BMN',
          zone: '32',
          min_x: '480000',
          min_y: '5880000',
          ext_min_x: 480000,
          ext_min_y: 5880000,
          ext_max_x: 490000,
          ext_max_y: 5890000,
        },
      });
    });
  });
});
