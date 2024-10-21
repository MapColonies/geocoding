/* eslint-disable @typescript-eslint/naming-convention */
import { ELASTIC_KEYWORDS } from '../../../../src/control/constants';
import { queryForSubTiles, queryForTiles, queryForTilesByBbox } from '../../../../src/control/tile/DAL/queries';

describe('tiles', () => {
  describe('#queryForTiles', () => {
    it('query for tile with disableFuzziness false', () => {
      const query = queryForTiles({
        tile: 'RIC',
        disableFuzziness: false,
      });
      expect(query).toStrictEqual({
        query: {
          bool: {
            must: [
              { term: { [ELASTIC_KEYWORDS.type]: 'TILE' } },
              { match: { [ELASTIC_KEYWORDS.tileName]: { fuzziness: 1, prefix_length: 1, query: 'RIC' } } },
            ],
          },
        },
      });
    });

    it('query for tile with disableFuzziness true', () => {
      const query = queryForTiles({
        tile: 'RIC',
        disableFuzziness: true,
      });
      expect(query).toStrictEqual({
        query: {
          bool: {
            must: [
              { term: { [ELASTIC_KEYWORDS.type]: 'TILE' } },
              { match: { [ELASTIC_KEYWORDS.tileName]: { fuzziness: undefined, prefix_length: 1, query: 'RIC' } } },
            ],
          },
        },
      });
    });
  });

  describe('#queryForSubTiles', () => {
    it('query for sub tile with disableFuzziness false', () => {
      const query = queryForSubTiles({
        tile: 'RIC',
        subTile: '66',
        disableFuzziness: false,
        limit: 5,
      });
      expect(query).toStrictEqual({
        query: {
          bool: {
            must: [
              { term: { [ELASTIC_KEYWORDS.type]: 'SUB_TILE' } },
              { term: { [ELASTIC_KEYWORDS.tileName]: 'RIC' } },
              {
                match: {
                  [ELASTIC_KEYWORDS.subTileId]: { query: '66', fuzziness: 1, prefix_length: 1 },
                },
              },
            ],
          },
        },
      });
    });

    it('query for sub tile with disableFuzziness true', () => {
      const query = queryForSubTiles({
        tile: 'RIC',
        subTile: '66',
        disableFuzziness: true,
        limit: 5,
      });
      expect(query).toStrictEqual({
        query: {
          bool: {
            must: [
              { term: { [ELASTIC_KEYWORDS.type]: 'SUB_TILE' } },
              { term: { [ELASTIC_KEYWORDS.tileName]: 'RIC' } },
              {
                match: {
                  [ELASTIC_KEYWORDS.subTileId]: { query: '66', fuzziness: undefined, prefix_length: 1 },
                },
              },
            ],
          },
        },
      });
    });
  });

  describe('#queryForTilesByBbox', () => {
    it('query for sub tile with disableFuzziness false', () => {
      const query = queryForTilesByBbox({
        bbox: [12.93694771534361, 52.51211561266182, 13.080296161196031, 52.60444267653175],
        disableFuzziness: false,
        limit: 5,
      });
      expect(query).toStrictEqual({
        query: {
          bool: {
            must: [{ term: { [ELASTIC_KEYWORDS.type]: 'TILE' } }],
            filter: [
              {
                geo_shape: {
                  geometry: {
                    shape: {
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
                    relation: 'intersects',
                  },
                },
              },
            ],
            should: undefined,
          },
        },
      });
    });

    it('query for sub tile with disableFuzziness true', () => {
      const query = queryForTilesByBbox({
        bbox: [12.93694771534361, 52.51211561266182, 13.080296161196031, 52.60444267653175],
        disableFuzziness: true,
        limit: 5,
      });
      expect(query).toStrictEqual({
        query: {
          bool: {
            must: [{ term: { [ELASTIC_KEYWORDS.type]: 'TILE' } }],
            filter: [
              {
                geo_shape: {
                  geometry: {
                    shape: {
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
                    relation: 'intersects',
                  },
                },
              },
            ],
            should: undefined,
          },
        },
      });
    });
  });
});
