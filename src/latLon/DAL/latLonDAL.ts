import { IConfig } from 'config';
import { Logger } from '@map-colonies/js-logger';
import cron from 'node-cron';
import { FactoryFunction, inject, injectable } from 'tsyringe';
import { InternalServerError } from '../../common/errors';
import { SERVICES } from '../../common/constants';
import { LATLON_CUSTOM_REPOSITORY_SYMBOL, LatLonRepository } from './latLonRepository';
import { LatLon as LatLonDb } from './latLon';

@injectable()
export class LatLonDAL {
  private latLonMap: Map<string, LatLonDb> | null;
  private onGoingUpdate: boolean;
  private dataLoad: Promise<void>;

  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(LATLON_CUSTOM_REPOSITORY_SYMBOL) private readonly latLonRepository: LatLonRepository,
    @inject(SERVICES.CONFIG) private readonly config: IConfig
  ) {
    this.latLonMap = new Map<string, LatLonDb>();
    this.onGoingUpdate = true;
    this.dataLoad = this.init().catch((error) => {
      this.logger.error('Failed to initialize latLon data', error);
      throw new InternalServerError(`Failed to initialize latLon data: ${(error as Error).message}`);
    });
  }

  public getOnGoingUpdate(): boolean {
    return this.onGoingUpdate;
  }

  public async init(): Promise<void> {
    this.logger.debug('Initializing latLonData');
    // reset dataLoad promise before overriding latLonMap
    this.dataLoad = new Promise((resolve) => resolve());
    this.onGoingUpdate = true;

    this.latLonMap = new Map<string, LatLonDb>();

    await (this.dataLoad = this.loadLatLonData());
    this.onGoingUpdate = false;
    this.logger.debug('latLonData initialized');
  }

  public async latLonToTile({ x, y, zone }: { x: number; y: number; zone: number }): Promise<LatLonDb | undefined> {
    await this.dataLoad;
    return this.latLonMap?.get(`${x},${y},${zone}`);
  }

  public async tileToLatLon(tileName: string): Promise<LatLonDb | undefined> {
    await this.dataLoad;
    return this.latLonMap?.get(tileName);
  }

  private async loadLatLonData(): Promise<void> {
    this.logger.debug('Loading latLon data');

    if (this.latLonMap === null) {
      await this.init();
    }

    const latLonData = await this.latLonRepository.getAll();
    latLonData.forEach((latLon) => {
      this.latLonMap?.set(latLon.tileName, latLon);
      this.latLonMap?.set(`${latLon.minX},${latLon.minY},${latLon.zone}`, latLon);
    });
    this.logger.debug('latLon data loaded');
  }
}

export const cronLoadTileLatLonDataSymbol = Symbol('cronLoadTileLatLonDataSymbol');

export const cronLoadTileLatLonDataFactory: FactoryFunction<void> = (dependencyContainer) => {
  const latLonDAL = dependencyContainer.resolve<LatLonDAL>(LatLonDAL);
  const logger = dependencyContainer.resolve<Logger>(SERVICES.LOGGER);
  const cronPattern: string | undefined = dependencyContainer.resolve<IConfig>(SERVICES.CONFIG).get('cronLoadTileLatLonDataPattern');
  if (cronPattern === undefined) {
    throw new InternalServerError('cron pattern is not defined');
  }
  cron.schedule(cronPattern, () => {
    if (!latLonDAL.getOnGoingUpdate()) {
      logger.info('cronLoadTileLatLonData: starting update');
      latLonDAL
        .init()
        .then(() => logger.info('cronLoadTileLatLonData: update completed'))
        .catch((error) => {
          logger.error('cronLoadTileLatLonData: update failed', error);
          throw new InternalServerError(`Failed to update latLon data: ${(error as Error).message}`);
        });
    } else {
      logger.info('cronLoadTileLatLonData: update is already in progress');
    }
  });
};
