/* eslint-disable @typescript-eslint/naming-convention */
import type { Feature } from 'geojson';
import { toCandidates, toMergedFeature, matchedTextOf } from '../../../src/smartQuery/utils';
import { CONTROL_FIELDS } from '../../../src/control/constants';
import type { GenericGeocodingResponse } from '../../../src/common/interfaces';
import type { MergedCandidate } from '../../../src/smartQuery/interfaces';

const response = (features: unknown[]): GenericGeocodingResponse<Feature> =>
  ({ type: 'FeatureCollection', geocoding: {}, features, bbox: null }) as unknown as GenericGeocodingResponse<Feature>;

const controlFeature = (overrides: Record<string, unknown>) => ({
  type: 'Feature',
  geometry: null,
  properties: {
    score: 3.2,
    matches: [{ layer: 'CONTROL.TILES', source: 'control_index', source_id: [] }],
    names: { default: ['Tile RIT'] },
    ...overrides,
  },
});

const placeFeature = (name: string, score: number) => ({
  type: 'Feature',
  geometry: null,
  properties: { score, matches: [{ layer: 'osm_airports', source: 'OSM', source_id: [] }], names: { default: [name] }, regions: [] },
});

describe('toCandidates', () => {
  it('numbers candidates by their position in their own source list', () => {
    const candidates = toCandidates(response([placeFeature('a', 9), placeFeature('b', 8)]), 'places');
    expect(candidates.map((c) => c.rank)).toEqual([0, 1]);
  });

  it('keeps the source score for diagnostics', () => {
    expect(toCandidates(response([placeFeature('a', 9)]), 'places')[0].rawScore).toBe(9);
  });

  it('reads a place name from the default name', () => {
    expect(toCandidates(response([placeFeature('Chiang Mai', 1)]), 'places')[0].matchedText).toBe('Chiang Mai');
  });

  it('reads a control object from its command name', () => {
    const candidates = toCandidates(response([controlFeature({ OBJECT_COMMAND_NAME: 'olimpiade' })]), 'control');
    expect(candidates[0].matchedText).toBe('olimpiade');
  });

  it('falls back through sub tile and tile for control objects without a command name', () => {
    expect(matchedTextOf(controlFeature({ SUB_TILE_ID: '66' }) as never, 'control')).toBe('66');
    expect(matchedTextOf(controlFeature({ TILE_NAME: 'RIT' }) as never, 'control')).toBe('RIT');
  });

  it('tolerates a feature with no score', () => {
    const candidates = toCandidates(
      response([{ type: 'Feature', geometry: null, properties: { names: { default: ['x'] }, matches: [] } }]),
      'places'
    );
    expect(candidates[0].rawScore).toBe(0);
  });
});

describe('toMergedFeature', () => {
  const merged = (overrides: Partial<MergedCandidate> = {}): MergedCandidate =>
    ({
      feature: controlFeature({ OBJECT_COMMAND_NAME: 'olimpiade' }),
      source: 'control',
      rank: 0,
      rawScore: 3.2,
      matchedText: 'olimpiade',
      finalScore: 0.0333,
      exactMatch: true,
      ...overrides,
    }) as unknown as MergedCandidate;

  it('replaces the score with the merged one and keeps the original', () => {
    const feature = toMergedFeature(merged());
    expect(feature.properties.score).toBe(0.0333);
    expect(feature.properties.source_score).toBe(3.2);
  });

  it('labels which backend answered', () => {
    expect(toMergedFeature(merged()).properties.match_source).toBe('control');
    expect(toMergedFeature(merged({ exactMatch: false })).properties.exact_match).toBe(false);
  });

  it('replaces the control index name with a stable source label', () => {
    expect(toMergedFeature(merged()).properties.matches[0].source).toBe('control');
  });

  it('leaves a place source label alone', () => {
    const feature = toMergedFeature(merged({ source: 'places', feature: placeFeature('a', 1) as never }));
    expect(feature.properties.matches[0].source).toBe('OSM');
  });

  it('defaults regions, which the location formatter may leave undefined', () => {
    const feature = toMergedFeature(
      merged({ feature: { type: 'Feature', geometry: null, properties: { names: { default: ['x'] }, matches: [] } } as never })
    );
    expect(feature.properties.regions).toEqual([]);
  });
});

describe('the exact match gate depends on fields the control search returns', () => {
  it('still requests the fields it compares on', () => {
    // trimming CONTROL_FIELDS would silently degrade the gate to plain rank fusion
    expect(CONTROL_FIELDS).toEqual(expect.arrayContaining(['properties.OBJECT_COMMAND_NAME', 'properties.TILE_NAME', 'properties.SUB_TILE_ID']));
  });
});
