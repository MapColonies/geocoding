/* eslint-disable @typescript-eslint/naming-convention */
import { generateSpans, tokenize } from '../../../../src/location/placeResolution/tokenize';
import {
  scoreCandidates,
  pickWinner,
  resolveOverlaps,
  decideMode,
  boundedLevenshtein,
  isPlausiblePlacetype,
} from '../../../../src/location/placeResolution/score';
import type { CandidateHit } from '../../../../src/location/placeResolution/score';
import type { HierarchySearchHit } from '../../../../src/location/models/elasticsearchHits';

const entry = (text: string): HierarchySearchHit =>
  ({ text, region: 'ISRAEL', hierarchy: 'city', placetype: 'city', geo_json: { type: 'Polygon', coordinates: [] } }) as HierarchySearchHit;

/** Builds the repository's shape: a gazetteer hit plus the named clauses it matched. */
const hit = (text: string, spanId: string, { phrase = true, score = 1 } = {}): CandidateHit => ({
  hit: entry(text),
  score,
  matchedQueries: [`${phrase ? 'p' : 'f'}:${spanId}`],
});

const spansOf = (query: string) => generateSpans(tokenize(query));
const spanFor = (query: string, text: string) => spansOf(query).find((s) => s.text === text)!;

describe('scoreCandidates', () => {
  it('scores an exact whole query match - the los angeles case', () => {
    const spans = spansOf('los angeles');
    const span = spanFor('los angeles', 'los angeles');
    const [candidate] = scoreCandidates([hit('Los Angeles', span.id)], spans, 2);

    expect(candidate.exactness).toBe(1);
    expect(candidate.confidence).toBeCloseTo(0.917, 3);
  });

  it('scores an exact match covering half the query - the school paris case', () => {
    const spans = spansOf('school paris');
    const span = spanFor('school paris', 'paris');
    const [candidate] = scoreCandidates([hit('Paris', span.id)], spans, 2);

    expect(candidate.exactness).toBe(1);
    expect(candidate.confidence).toBeCloseTo(0.758, 3);
  });

  it('scores a span contained in a longer gazetteer entry lower', () => {
    const spans = spansOf('school new york');
    const span = spanFor('school new york', 'new york');
    const [candidate] = scoreCandidates([hit('New York City', span.id)], spans, 3);

    expect(candidate.exactness).toBe(0.8);
    expect(candidate.confidence).toBeCloseTo(0.747, 3);
  });

  it('scores a fuzzy only match lowest', () => {
    const spans = spansOf('tel avivv');
    const span = spanFor('tel avivv', 'tel avivv');
    const [candidate] = scoreCandidates([hit('Haifa', span.id, { phrase: false })], spans, 2);

    expect(candidate.exactness).toBe(0.5);
  });

  it('ignores a single token span that is not an exact match', () => {
    // "los" inside "Los Angeles" is the accident the gate exists to stop
    const spans = spansOf('los angeles');
    const span = spanFor('los angeles', 'los');
    expect(scoreCandidates([hit('Los Angeles', span.id)], spans, 2)).toEqual([]);
  });

  it('ignores a bare fuzzy single token hit', () => {
    const spans = spansOf('york');
    const span = spanFor('york', 'york');
    expect(scoreCandidates([hit('Port', span.id, { phrase: false })], spans, 1)).toEqual([]);
  });

  it('keeps a single token span when it matches exactly', () => {
    const spans = spansOf('jerusalem');
    const span = spanFor('jerusalem', 'jerusalem');
    expect(scoreCandidates([hit('Jerusalem', span.id)], spans, 1)).toHaveLength(1);
  });

  it('handles a multilingual gazetteer entry stored as an array of names', () => {
    const spans = spansOf('תל אביב');
    const span = spanFor('תל אביב', 'תל אביב');
    const multi = { ...hit('ignored', span.id) };
    (multi.hit as unknown as { text: string[] }).text = ['Tel Aviv', 'תל אביב'];

    const [candidate] = scoreCandidates([multi], spans, 2);
    expect(candidate.exactness).toBe(1);
  });

  it('ignores a clause name that is not in the expected form', () => {
    const spans = spansOf('תל אביב');
    const malformed = { hit: entry('תל אביב'), score: 1, matchedQueries: ['nonsense'] };
    expect(scoreCandidates([malformed], spans, 2)).toEqual([]);
  });

  it('drops a hit whose matched clause names a span that does not exist', () => {
    const spans = spansOf('תל אביב');
    expect(scoreCandidates([hit('תל אביב', '99:9')], spans, 2)).toEqual([]);
  });
});

describe('pickWinner', () => {
  const spans = spansOf('בית ספר תל אביב');

  it('returns undefined when there is nothing to pick', () => {
    expect(pickWinner([])).toBeUndefined();
  });

  it('prefers the higher confidence', () => {
    // a two token exact match beats a one token exact match: longer span, more of the query covered
    const candidates = scoreCandidates(
      [hit('תל אביב', spanFor('בית ספר תל אביב', 'תל אביב').id), hit('ספר', spanFor('בית ספר תל אביב', 'ספר').id)],
      spans,
      4
    );
    expect(pickWinner(candidates)!.span.text).toBe('תל אביב');
  });

  it('prefers a longer exact match over a shorter one', () => {
    const candidates = scoreCandidates(
      [hit('תל אביב', spanFor('בית ספר תל אביב', 'תל אביב').id), hit('ספר תל אביב', spanFor('בית ספר תל אביב', 'ספר תל אביב').id)],
      spans,
      4
    );
    expect(pickWinner(candidates)!.span.text).toBe('ספר תל אביב');
  });

  it('prefers the span later in the query when confidence ties - places trail', () => {
    const query = 'aa bb';
    const local = spansOf(query);
    const candidates = scoreCandidates([hit('aa', spanFor(query, 'aa').id), hit('bb', spanFor(query, 'bb').id)], local, 2);
    expect(pickWinner(candidates)!.span.text).toBe('bb');
  });

  it('is deterministic under reordering of the input', () => {
    const candidates = scoreCandidates(
      [hit('תל אביב', spanFor('בית ספר תל אביב', 'תל אביב').id), hit('בית ספר', spanFor('בית ספר תל אביב', 'בית ספר').id)],
      spans,
      4
    );
    const forward = pickWinner(candidates)!.span.id;
    const backward = pickWinner([...candidates].reverse())!.span.id;
    expect(forward).toBe(backward);
  });

  it('breaks a remaining tie on the NLP name hint', () => {
    const query = 'aa bb';
    const local = spansOf(query);
    const candidates = scoreCandidates([hit('aa', spanFor(query, 'aa').id), hit('bb', spanFor(query, 'bb').id)], local, 2);
    expect(pickWinner(candidates, 'aa')!.span.text).toBe('bb');
  });
});

describe('resolveOverlaps', () => {
  it('drops candidates whose tokens overlap the winner', () => {
    const query = 'בית ספר תל אביב';
    const spans = spansOf(query);
    const candidates = scoreCandidates(
      [hit('תל אביב', spanFor(query, 'תל אביב').id), hit('ספר תל', spanFor(query, 'ספר תל').id), hit('בית ספר', spanFor(query, 'בית ספר').id)],
      spans,
      4
    );
    const winner = pickWinner(candidates)!;
    const rest = resolveOverlaps(candidates, winner);

    expect(rest.map((c) => c.span.text)).toEqual(['בית ספר']);
  });

  it('keeps at most the configured number of runners up', () => {
    const query = 'aa bb cc dd ee ff gg hh';
    const spans = spansOf(query);
    const candidates = scoreCandidates(
      ['aa', 'bb', 'cc', 'dd', 'ee', 'ff', 'gg', 'hh'].map((t) => hit(t, spanFor(query, t).id)),
      spans,
      8
    );
    const winner = pickWinner(candidates)!;
    expect(resolveOverlaps(candidates, winner).length).toBeLessThanOrEqual(3);
  });
});

describe('decideMode', () => {
  it('filters at high confidence', () => {
    expect(decideMode(0.917)).toBe('filter');
    expect(decideMode(0.75)).toBe('filter');
  });

  it('boosts in the middle band', () => {
    expect(decideMode(0.747)).toBe('boost');
    expect(decideMode(0.45)).toBe('boost');
  });

  it('ignores anything below the boost threshold', () => {
    expect(decideMode(0.44)).toBeUndefined();
  });
});

describe('boundedLevenshtein', () => {
  it('counts edits up to the bound', () => {
    expect(boundedLevenshtein('port', 'port', 2)).toBe(0);
    expect(boundedLevenshtein('port', 'ports', 2)).toBe(1);
    expect(boundedLevenshtein('york', 'port', 2)).toBe(2);
  });

  it('gives up past the bound rather than computing the exact distance', () => {
    expect(boundedLevenshtein('airport', 'school', 2)).toBeGreaterThan(2);
  });

  it('handles an empty string', () => {
    expect(boundedLevenshtein('', 'ab', 2)).toBe(2);
  });

  it('short circuits on a large length difference without walking the matrix', () => {
    expect(boundedLevenshtein('a', 'abcdefghij', 2)).toBe(3);
  });
});

describe('isPlausiblePlacetype', () => {
  it('rejects the placetype that fuzzy matching invented', () => {
    // "york" reaching the placetype "port" is why a search for New York returned Port of LA
    expect(isPlausiblePlacetype('port', ['new', 'york'])).toBe(false);
  });

  it('accepts a placetype the user actually typed', () => {
    expect(isPlausiblePlacetype('airport', ['airport', 'los', 'angeles'])).toBe(true);
  });

  it('accepts a plural, which is one edit from a long enough token', () => {
    expect(isPlausiblePlacetype('airport', ['airports'])).toBe(true);
  });

  it('does not allow an edit against a short token', () => {
    // 'port' and 'port' differ by zero, but 'por' is too short to earn the one edit allowance
    expect(isPlausiblePlacetype('port', ['por'])).toBe(false);
  });

  it('ignores case and Hebrew diacritics', () => {
    expect(isPlausiblePlacetype('School', ['school'])).toBe(true);
  });
});
