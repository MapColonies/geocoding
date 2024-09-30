/* eslint-disable @typescript-eslint/naming-convention */
import { Logger } from '@map-colonies/js-logger';
import { DataSource } from 'typeorm';
import { FactoryFunction } from 'tsyringe';
import { SERVICES } from '../../common/constants';
import { LatLon as LatLonDb } from './latLon';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const createLatLonRepository = (dataSource: DataSource, logger: Logger) => {
  return dataSource.getRepository(LatLonDb).extend({
    async getAll(): Promise<LatLonDb[]> {
      const result = await this.find();
      return result;
    },
  });
};

export type LatLonRepository = ReturnType<typeof createLatLonRepository>;

export const latLonRepositoryFactory: FactoryFunction<LatLonRepository> = (depContainer) => {
  return createLatLonRepository(depContainer.resolve<DataSource>(DataSource), depContainer.resolve<Logger>(SERVICES.LOGGER));
};

export const LATLON_CUSTOM_REPOSITORY_SYMBOL = Symbol('LATLON_CUSTOM_REPOSITORY_SYMBOL');
