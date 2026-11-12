import { mergeCandidates } from '../../../src/smartQuery/models/merge';
import type { SmartCandidate } from '../../../src/smartQuery/interfaces';

const candidate = (source: 'control' | 'places', rank: number, rawScore: number, matchedText?: string): SmartCandidate =>
  ({
    feature: { type: 'Feature', geometry: null, properties: { names: { default: [matchedText ?? `${source}-${rank}`] } } },
    source,
    rank,
    rawScore,
    matchedText,
  }) as unknown as SmartCandidate;

const merge = (candidates: SmartCandidate[], options: Partial<Parameters<typeof mergeCandidates>[1]> = {}) =>
  mergeCandidates(candidates, { weights: { control: 0.5, places: 0.5 }, normalizedQuery: 'anything', limit: 10, ...options });

describe('mergeCandidates', () => {
  it('ignores the raw score scales, which are not comparable across indices', () => {
    // control hits score ~0.4, places hits ~12 - ranking on those would always pick places
    const merged = merge([candidate('control', 0, 0.4), candidate('places', 0, 12)]);
    expect(merged.map((c) => c.source)).toEqual(['control', 'places']);
    expect(merged[0].finalScore).toBe(merged[1].finalScore);
  });

  it('orders by rank within a source', () => {
    const merged = merge([candidate('places', 2, 1), candidate('places', 0, 1), candidate('places', 1, 1)]);
    expect(merged.map((c) => c.rank)).toEqual([0, 1, 2]);
  });

  it('does not blow up on a single hit source', () => {
    // min/max normalization would divide by zero here
    const merged = merge([candidate('control', 0, 5)]);
    expect(merged).toHaveLength(1);
    expect(Number.isFinite(merged[0].finalScore)).toBe(true);
  });

  it('promotes an exact key field match above a better ranked fuzzy one', () => {
    const merged = merge([candidate('places', 0, 9), candidate('control', 1, 0.2, 'olimpiade')], { normalizedQuery: 'olimpiade' });
    expect(merged[0].source).toBe('control');
    expect(merged[0].exactMatch).toBe(true);
  });

  it('compares the exact match case insensitively and after normalization', () => {
    const merged = merge([candidate('control', 0, 1, 'Via CamillucciaA')], { normalizedQuery: 'via camillucciaa' });
    expect(merged[0].exactMatch).toBe(true);
  });

  it('weights a confident source above an unsure one at the same rank', () => {
    const merged = merge([candidate('places', 0, 1), candidate('control', 0, 1)], { weights: { control: 0.9, places: 0.3 } });
    expect(merged[0].source).toBe('control');
  });

  it('respects the limit', () => {
    const many = Array.from({ length: 12 }, (_, i) => candidate('places', i, 1));
    expect(merge(many, { limit: 5 })).toHaveLength(5);
  });

  it('applies no per source quota - a clear tile query returns tiles only', () => {
    const controls = Array.from({ length: 5 }, (_, i) => candidate('control', i, 1));
    const places = Array.from({ length: 5 }, (_, i) => candidate('places', i, 1));
    const merged = merge([...controls, ...places], { weights: { control: 0.95, places: 0.3 }, limit: 5 });
    expect(merged.every((c) => c.source === 'control')).toBe(true);
  });

  it('is deterministic under reordering of the input', () => {
    const input = [candidate('control', 0, 1), candidate('places', 0, 1), candidate('control', 1, 1), candidate('places', 1, 1)];
    const forward = merge(input).map((c) => `${c.source}:${c.rank}`);
    const backward = merge([...input].reverse()).map((c) => `${c.source}:${c.rank}`);
    expect(forward).toEqual(backward);
  });

  it('breaks a full tie in favour of control', () => {
    const merged = merge([candidate('places', 0, 1), candidate('control', 0, 1)]);
    expect(merged[0].source).toBe('control');
  });

  it('returns an empty list for no candidates', () => {
    expect(merge([])).toEqual([]);
  });
});
