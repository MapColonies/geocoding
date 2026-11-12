import { classifyQuery } from '../../../src/smartQuery/models/classifier';
import { decideBackends, sourceWeights } from '../../../src/smartQuery/models/dispatch';

const backendsFor = (query: string) => decideBackends(classifyQuery(query));

describe('decideBackends', () => {
  it.each([
    ['18SUJ2338907395', { control: false, places: false, mgrsTiles: true }],
    ['RIT 66', { control: true, places: false, mgrsTiles: false }],
    ['RIT', { control: true, places: true, mgrsTiles: false }],
    ['1234', { control: true, places: false, mgrsTiles: false }],
    ['via camillucciaA', { control: true, places: true, mgrsTiles: false }],
    ['בית ספר תל אביב', { control: true, places: true, mgrsTiles: false }],
  ])('routes %s correctly', (query, expected) => {
    expect(backendsFor(query)).toEqual(expected);
  });

  it('never asks the places backend for digits, which cannot be a place name', () => {
    expect(backendsFor('1234').places).toBe(false);
  });

  it('asks exactly one backend for MGRS', () => {
    const backends = backendsFor('18SUJ2338907395');
    expect(Object.values(backends).filter(Boolean)).toHaveLength(1);
  });

  it('always asks at least one backend', () => {
    for (const query of ['RIT', 'RIT 66', '1234', '18SUJ2338907395', 'abc def', 'תל אביב']) {
      expect(Object.values(backendsFor(query)).some(Boolean)).toBe(true);
    }
  });
});

describe('sourceWeights', () => {
  it('weights control above places for a short letter token', () => {
    const weights = sourceWeights(classifyQuery('RIT'));
    expect(weights.control).toBeGreaterThan(weights.places);
  });

  it('weights the two sources equally for ambiguous free text', () => {
    const weights = sourceWeights(classifyQuery('via camillucciaA'));
    expect(weights.control).toBe(weights.places);
  });

  it('gives places no weight when there is no place intent', () => {
    expect(sourceWeights(classifyQuery('1234')).places).toBe(0);
  });

  it('takes the strongest control intent when several are present', () => {
    const { control } = sourceWeights(classifyQuery('RIT 66'));
    expect(control).toBe(0.95);
  });
});
