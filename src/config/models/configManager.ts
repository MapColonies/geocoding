/* eslint-disable @typescript-eslint/naming-convention */
import { inject, injectable } from 'tsyringe';
import { LatLonDAL, latLonDalSymbol } from '../../latLon/DAL/latLonDAL';

@injectable()
export class ConfigManager {
  public constructor(@inject(latLonDalSymbol) private readonly latLonDAL: LatLonDAL) {}

  public async getControlTable(): ReturnType<LatLonDAL['getLatLonTable']> {
    const response = await this.latLonDAL.getLatLonTable();
    return response;
  }
}
