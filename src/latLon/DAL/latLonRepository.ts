/* eslint-disable @typescript-eslint/naming-convention */
import { DataSource } from 'typeorm';
import { FactoryFunction } from 'tsyringe';
import { LatLon as LatLonDb } from './latLon';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const createLatLonRepository = (dataSource: DataSource) => {
  return dataSource.getRepository(LatLonDb).extend({
    async getAll(): Promise<LatLonDb[]> {
      const result = await this.find();
      return result;
    },
  });
};

export type LatLonRepository = ReturnType<typeof createLatLonRepository>;

export const latLonRepositoryFactory: FactoryFunction<LatLonRepository> = (depContainer) => {
  return createLatLonRepository(depContainer.resolve<DataSource>(DataSource));
};

export const LATLON_CUSTOM_REPOSITORY_SYMBOL = Symbol('LATLON_CUSTOM_REPOSITORY_SYMBOL');
