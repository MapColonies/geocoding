/* eslint-disable @typescript-eslint/naming-convention */
import { inject, injectable } from 'tsyringe';
import { LatLonDAL, latLonDalSymbol } from '../../latLon/DAL/latLonDAL';

@injectable()
export class ConfigManager {
  public constructor(@inject(latLonDalSymbol) private readonly latLonDAL: LatLonDAL) {}

  public getControlTable(): ReturnType<LatLonDAL['getLatLonTable']> {
    return this.latLonDAL.getLatLonTable();
  }
}
