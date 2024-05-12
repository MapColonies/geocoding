/* eslint-disable @typescript-eslint/naming-convention */
import { DataSource } from 'typeorm';
import { FactoryFunction } from 'tsyringe';
import { LatLon as LatLonDb } from './latLon';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const createLatLonRepository = (dataSource: DataSource) => {
  return dataSource.getRepository(LatLonDb).extend({
    async latLonToTile({ x, y, zone }: { x: number; y: number; zone: number }): Promise<LatLonDb | null> {
      const result = await this.findOne({
        where: {
          minX: x.toString(),
          minY: y.toString(),
          zone: zone.toString(),
        },
      });

      return result;
    },

    async tileToLatLon(tileName: string): Promise<LatLonDb | null> {
      const result = await this.findOne({
        where: {
          tileName,
        },
      });

      return result;
    },
  });
};

export type LatLonRepository = ReturnType<typeof createLatLonRepository>;

export const latLonRepositoryFactory: FactoryFunction<LatLonRepository> = (depContainer) => {
  return createLatLonRepository(depContainer.resolve<DataSource>(DataSource));
};

export const LATLON_CUSTOM_REPOSITORY_SYMBOL = Symbol('LATLON_CUSTOM_REPOSITORY_SYMBOL');
