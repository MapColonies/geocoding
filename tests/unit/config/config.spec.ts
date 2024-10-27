/* eslint-disable @typescript-eslint/naming-convention */
import { InternalServerError } from '../../../src/common/errors';
import { ConfigManager } from '../../../src/config/models/configManager';
import { LatLonDAL } from '../../../src/latLon/DAL/latLonDAL';

let configManager: ConfigManager;
describe('#ConfigManager', () => {
  beforeEach(() => {
    const latLonDAL = {
      getLatLonTable: () => ({
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
      }),
    } as unknown as LatLonDAL;
    configManager = new ConfigManager(latLonDAL);
  });

  describe('happy path', () => {
    it('should return Control Grid Table data', async () => {
      const result = await configManager.getControlTable();
      expect(result).toEqual({
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

  describe('sad path', () => {
    it('should return error', async () => {
      jest.spyOn(configManager, 'getControlTable').mockRejectedValue(new InternalServerError('Error'));
      await expect(configManager.getControlTable()).rejects.toThrow('Error');
    });
  });
});
