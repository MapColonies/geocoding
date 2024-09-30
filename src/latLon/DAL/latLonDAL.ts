import { Logger } from '@map-colonies/js-logger';
import cron from 'node-cron';
import { FactoryFunction, inject, injectable } from 'tsyringe';
import { InternalServerError } from '../../common/errors';
import { IApplication } from '../../common/interfaces';
import { SERVICES } from '../../common/constants';
import { LATLON_CUSTOM_REPOSITORY_SYMBOL, LatLonRepository } from './latLonRepository';
import { LatLon as LatLonDb } from './latLon';

@injectable()
export class LatLonDAL {
  private readonly latLonMap: Map<string, LatLonDb>;
  private onGoingUpdate: boolean;
  private dataLoad:
    | {
        promise?: Promise<void>;
        resolve?: (value: unknown) => void;
        reject?: (reason?: unknown) => void;
      }
    | undefined;
  private dataLoadError: boolean;

  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(LATLON_CUSTOM_REPOSITORY_SYMBOL) private readonly latLonRepository: LatLonRepository
  ) {
    this.latLonMap = new Map<string, LatLonDb>();
    this.onGoingUpdate = true;
    this.dataLoad = undefined;
    this.dataLoadError = false;
    this.init().catch((error) => {
      this.logger.error('Failed to initialize lat-lon data', error);
      this.dataLoadError = true;
    });
  }

  /* istanbul ignore next */
  public getOnGoingUpdate(): boolean {
    return this.onGoingUpdate;
  }
  /* istanbul ignore end */

  public async init(): Promise<void> {
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
      this.logger.error('Failed to initialize latLon data', error);
      this.dataLoadError = true;
    } finally {
      this.onGoingUpdate = false;
      this.dataLoad = undefined;
    }
  }

  public async latLonToTile({ x, y, zone }: { x: number; y: number; zone: number }): Promise<LatLonDb | undefined> {
    if (this.dataLoadError) {
      throw new InternalServerError('Lat-lon to tile data currently not available');
    }
    await this.dataLoad?.promise;
    return this.latLonMap.get(`${x},${y},${zone}`);
  }

  public async tileToLatLon(tileName: string): Promise<LatLonDb | undefined> {
    if (this.dataLoadError) {
      throw new InternalServerError('Tile to lat-lon data currently not available');
    }
    await this.dataLoad?.promise;
    return this.latLonMap.get(tileName);
  }

  private clearLatLonMap(): void {
    this.logger.debug('Clearing latLon data');
    this.latLonMap.clear();
  }

  private async loadLatLonData(): Promise<void> {
    this.logger.debug('Loading latLon data');

    this.clearLatLonMap();

    const latLonData = await this.latLonRepository.getAll();
    latLonData.forEach((latLon) => {
      this.latLonMap.set(latLon.tileName, latLon);
      this.latLonMap.set(`${latLon.minX},${latLon.minY},${latLon.zone}`, latLon);
    });
    this.logger.debug('latLon data loaded');
  }
}

export const cronLoadTileLatLonDataSymbol = Symbol('cronLoadTileLatLonDataSymbol');

export const cronLoadTileLatLonDataFactory: FactoryFunction<void> = (dependencyContainer) => {
  const latLonDAL = dependencyContainer.resolve<LatLonDAL>(LatLonDAL);
  const logger = dependencyContainer.resolve<Logger>(SERVICES.LOGGER);
  const cronPattern: string | undefined = dependencyContainer.resolve<IApplication>(SERVICES.APPLICATION).cronLoadTileLatLonDataPattern;

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (cronPattern === undefined) {
    throw new Error('cron pattern is not defined');
  }

  /* istanbul ignore next */
  cron.schedule(cronPattern, () => {
    if (!latLonDAL.getOnGoingUpdate()) {
      logger.info('cronLoadTileLatLonData: starting update');
      latLonDAL
        .init()
        .then(() => logger.info('cronLoadTileLatLonData: update completed'))
        .catch((error) => {
          logger.error('cronLoadTileLatLonData: update failed', error);
        });
    } else {
      logger.info('cronLoadTileLatLonData: update is already in progress');
    }
  });
  /* istanbul ignore end */
};
