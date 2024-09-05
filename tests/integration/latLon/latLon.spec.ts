/* eslint-disable @typescript-eslint/naming-convention */
import { IConfig } from 'config';
import { PutObjectCommand, CreateBucketCommand, DeleteBucketCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import jsLogger from '@map-colonies/js-logger';
import { trace } from '@opentelemetry/api';
import httpStatusCodes from 'http-status-codes';
import { getApp } from '../../../src/app';
import { SERVICES } from '../../../src/common/constants';
import { S3Config, s3ConfigPath } from '../../../src/common/s3';
import mockDataJson from '../../../devScripts/latLonConvertions.json';
import { LatLonDAL } from '../../../src/latLon/DAL/latLonDAL';
import { LatLonRequestSender } from './helpers/requestSender';

describe('/lookup', function () {
  let requestSender: LatLonRequestSender;
  let s3Client: S3Client;
  let s3Config: S3Config | undefined;

  beforeAll(async function () {
    const app = await getApp({
      override: [
        { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
        { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
      ],
      useChild: true,
    });
    const config = app.container.resolve<IConfig>(SERVICES.CONFIG);
    s3Client = app.container.resolve<S3Client>(SERVICES.S3_CLIENT);

    s3Config = config.get<S3Config | undefined>(s3ConfigPath);

    if (s3Config === undefined || s3Config.files.latLonConvertionTable === undefined) {
      throw new Error('S3 configuration is missing');
    }

    const { bucket: Bucket, fileName: Key } = s3Config.files.latLonConvertionTable;

    try {
      await s3Client.send(new CreateBucketCommand({ Bucket, ACL: 'public-read' }));
    } catch (error) {
      console.error(error);
    }

    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket,
          Key,
          Body: Buffer.from(JSON.stringify(mockDataJson), 'utf-8'),
        })
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  });

  afterAll(async function () {
    try {
      if (s3Config?.files.latLonConvertionTable !== undefined) {
        await s3Client.send(
          new DeleteObjectCommand({ Bucket: s3Config.files.latLonConvertionTable.bucket, Key: s3Config.files.latLonConvertionTable.fileName })
        );
        await s3Client.send(new DeleteBucketCommand({ Bucket: s3Config.files.latLonConvertionTable.bucket }));
      }
    } catch (error) {
      console.error(error);
      throw error;
    }
  });

  beforeEach(async function () {
    const app = await getApp({
      override: [
        { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
        { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
      ],
      useChild: true,
    });

    requestSender = new LatLonRequestSender(app.app);
  });

  describe('Happy Path', function () {
    it('should return 200 status code and tile from lat-lon', async function () {
      const response = await requestSender.convertCoordinatesToGrid({
        lat: 52.57326537485767,
        lon: 12.948781146422107,
        target_grid: 'control',
      });

      expect(response.status).toBe(httpStatusCodes.OK);
      //   expect(response).toSatisfyApiSpec();
      expect(response.body).toEqual({
        type: 'Feature',
        query: {
          lat: 52.57326537485767,
          lon: 12.948781146422107,
        },
        response: {},
        properties: {
          tileName: 'BRN',
          subTileNumber: ['06', '97', '97'],
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [12.93694771534361, 52.51211561266182],
              [12.93694771534361, 52.60444267653175],
              [13.080296161196031, 52.60444267653175],
              [13.080296161196031, 52.51211561266182],
              [12.93694771534361, 52.51211561266182],
            ],
          ],
        },
        bbox: [12.93694771534361, 52.51211561266182, 13.080296161196031, 52.60444267653175],
      });
    });

    it('should return 200 status code and MGRS from lat-lon', async function () {
      const response = await requestSender.convertCoordinatesToGrid({
        lat: 52.57326537485767,
        lon: 12.948781146422107,
        target_grid: 'MGRS',
      });

      expect(response.status).toBe(httpStatusCodes.OK);
      //   expect(response).toSatisfyApiSpec();
      expect(response.body).toEqual({
        type: 'Feature',
        query: {
          lat: 52.57326537485767,
          lon: 12.948781146422107,
        },
        response: {},
        geometry: {
          type: 'Point',
          coordinates: [12.948781146422107, 52.57326537485767],
        },
        properties: {
          accuracy: '1m',
          mgrs: '33UUU6099626777',
        },
      });
    });
  });

  describe('Bad Path', function () {
    it('should retrun 400 status code when invalid lat lon', async function () {
      const response = await requestSender.convertCoordinatesToGrid({
        lat: 67.9435100890131,
        lon: -84.41903041752825,
        target_grid: 'control',
      });

      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      //   expect(response).toSatisfyApiSpec();
      expect(response.body).toEqual({
        message: "Invalid lat lon, check 'lat' and 'lon' keys exists and their values are legal",
      });
    });

    it('should return 400 status code when the coordinate is outside the grid extent', async function () {
      const response = await requestSender.convertCoordinatesToGrid({
        lat: 32.57326537485767,
        lon: 12.948781146422107,
        target_grid: 'control',
      });

      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      //   expect(response).toSatisfyApiSpec();
      expect(response.body).toEqual({
        message: 'The coordinate is outside the grid extent',
      });
    });
  });

  describe('Sad Path', function () {
    it('should return 500 as isDataLoadError is true for control', async function () {
      const dataLoadErrorSpy = jest.spyOn(LatLonDAL.prototype, 'getIsDataLoadError').mockReturnValue(true);

      const response = await requestSender.convertCoordinatesToGrid({
        lat: 32.57326537485767,
        lon: 12.948781146422107,
        target_grid: 'control',
      });

      expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
      //   expect(response).toSatisfyApiSpec();
      expect(response.body).toEqual({
        message: 'Lat-lon to tile data currently not available',
        stacktrace: expect.any(String) as string,
      });

      dataLoadErrorSpy.mockRestore();
    });

    // it('should return 500 as init is errored', async function () {
    //   const dataLoadErrorSpy = jest.spyOn(LatLonDAL.prototype as any, 'loadLatLonData').mockRejectedValue(new Error('some error'));

    //   const response = await requestSender.convertCoordinatesToGrid({
    //     lat: 52.57326537485767,
    //     lon: 12.948781146422107,
    //     target_grid: 'control',
    //   });

    //   console.log(response.status, response.body);
    //   expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
    //   //   expect(response).toSatisfyApiSpec();
    //   expect(response.body).toEqual({
    //     message: 'Lat-lon to tile data currently not available',
    //     stacktrace: expect.any(String) as string,
    //   });

    //   dataLoadErrorSpy.mockRestore();
    // });
  });
});
