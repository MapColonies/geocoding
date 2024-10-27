import fs from 'fs';
import { Logger } from '@map-colonies/js-logger';
import cron from 'node-cron';
import { FactoryFunction, inject, injectable } from 'tsyringe';
import { InternalServerError } from '../../common/errors';
import { IApplication } from '../../common/interfaces';
import { SERVICES } from '../../common/constants';
import { LatLon as ILatLon } from '../models/latLon';
import { ConvertCamelToSnakeCase } from '../../common/utils';
import { S3_REPOSITORY_SYMBOL, S3Repository } from '../../common/s3/s3Repository';

type LatLon = ConvertCamelToSnakeCase<ILatLon>;
let scheduledTask: cron.ScheduledTask | null = null;

let latLonDALInstance: LatLonDAL | null = null;

@injectable()
export class LatLonDAL {
  private latLonTable: Record<string, LatLon>;
  private onGoingUpdate: boolean;
  private dataLoad:
    | {
        promise?: Promise<void>;
        resolve?: (value: unknown) => void;
        reject?: (reason?: unknown) => void;
      }
    | undefined;
  private dataLoadError: boolean;
  private latLonTableTemp: Record<string, LatLon> | null = null;

  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(S3_REPOSITORY_SYMBOL) private readonly latLonRepository: S3Repository
  ) {
    this.latLonTable = {};
    this.onGoingUpdate = true;
    this.dataLoad = undefined;
    this.dataLoadError = false;

    this.update().catch((error: Error) => {
      this.logger.error({ msg: 'Failed to initialize lat-lon data', error });
      this.dataLoadError = true;
    });
  }

  /* istanbul ignore next */
  public getOnGoingUpdate(): boolean {
    return this.onGoingUpdate;
  }

  public getIsDataLoadError(): boolean {
    return this.dataLoadError;
  }
  /* istanbul ignore end */

  public async update(): Promise<void> {
    try {
      const dataLoadPromise = new Promise((resolve, reject) => {
        this.dataLoadError = false;
        this.dataLoad = { resolve, reject };
      })
        .then(() => (this.dataLoad = undefined))
        .catch(() => {
          this.dataLoad = undefined;
          this.dataLoadError = true;
        });
      this.dataLoad = { ...this.dataLoad, promise: dataLoadPromise };

      this.onGoingUpdate = true;

      this.logger.debug('Initializing latLonData');

      await this.loadLatLonData();
      this.dataLoad.resolve?.('finished loading data');

      this.logger.debug('latLonData initialized');
    } catch (error) {
      this.logger.error({ msg: `Failed to initialize latLon data.`, error });
      this.dataLoadError = true;
    } finally {
      this.onGoingUpdate = false;
      this.dataLoad = undefined;
    }
  }

  public async latLonToTile({ x, y, zone }: { x: number; y: number; zone: number }): Promise<LatLon | undefined> {
    if (this.getIsDataLoadError()) {
      throw new InternalServerError('Lat-lon to tile data currently not available');
    }
    await this.dataLoad?.promise;
    return this.latLonTable[`${x},${y},${zone}`];
  }

  public getLatLonTable(): Record<string, LatLon> {
    return this.latLonTable;
  }

  private async loadLatLonData(): Promise<void> {
    this.logger.debug('Loading latLon data');

    this.latLonTableTemp = {};

    const latLonDataPath = await this.latLonRepository.downloadFile('latLonConvertionTable');

    const { items: latLonData } = JSON.parse(await fs.promises.readFile(latLonDataPath, 'utf8')) as { items: LatLon[] };

    latLonData.forEach((latLon) => {
      this.latLonTableTemp![`${latLon.min_x},${latLon.min_y},${latLon.zone}`] = latLon;
    });

    this.latLonTable = this.latLonTableTemp;
    this.latLonTableTemp = null;
    Object.freeze(this.latLonTable);

    try {
      await fs.promises.unlink(latLonDataPath);
    } catch (error) {
      this.logger.error({ msg: `Failed to delete latLonData file ${latLonDataPath}.`, error });
    }
    this.logger.info('loadLatLonData: update completed');
  }
}

export const cronLoadTileLatLonDataSymbol = Symbol('cronLoadTileLatLonDataSymbol');

export const latLonDalSymbol = Symbol('latLonDalSymbol');
export const latLonSignletonFactory: FactoryFunction<LatLonDAL> = (dependencyContainer) => {
  const logger = dependencyContainer.resolve<Logger>(SERVICES.LOGGER);
  const s3Repository = dependencyContainer.resolve<S3Repository>(S3_REPOSITORY_SYMBOL);

  if (latLonDALInstance !== null) {
    return latLonDALInstance;
  }

  latLonDALInstance = new LatLonDAL(logger, s3Repository);
  return latLonDALInstance;
};

export const cronLoadTileLatLonDataFactory: FactoryFunction<cron.ScheduledTask> = (dependencyContainer) => {
  const latLonDAL = dependencyContainer.resolve<LatLonDAL>(latLonDalSymbol);
  const logger = dependencyContainer.resolve<Logger>(SERVICES.LOGGER);
  const cronPattern: string | undefined = dependencyContainer.resolve<IApplication>(SERVICES.APPLICATION).cronLoadTileLatLonDataPattern;

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (cronPattern === undefined) {
    throw new Error('cron pattern is not defined');
  }

  /* istanbul ignore next */
  scheduledTask = cron.schedule(cronPattern, () => {
    if (!latLonDAL.getOnGoingUpdate()) {
      logger.info('cronLoadTileLatLonData: starting update');
      latLonDAL.update().catch((error: Error) => {
        logger.error({ msg: 'cronLoadTileLatLonData: update failed', error });
      });
    } else {
      logger.info('cronLoadTileLatLonData: update is already in progress');
    }
  });
  return scheduledTask;
  /* istanbul ignore end */
};
