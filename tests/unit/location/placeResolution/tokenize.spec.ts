import { normalize, tokenize, generateSpans, removeSpan } from '../../../../src/location/placeResolution/tokenize';

describe('normalize', () => {
  it('strips Hebrew points and accents', () => {
    expect(normalize('רִאשׁוֹן לְצִיּוֹן')).toBe('ראשון לציון');
  });

  it('turns a maqaf into a space so it matches an unpointed gazetteer entry', () => {
    expect(normalize('בת־ים')).toBe('בת ים');
  });

  it('removes gershayim and quotes without splitting the word', () => {
    expect(normalize('צה״ל')).toBe('צהל');
    expect(normalize('נתב"ג')).toBe('נתבג');
    expect(normalize("ד'ש")).toBe('דש');
  });

  it('lowercases and collapses whitespace', () => {
    expect(normalize('  Los   ANGELES ')).toBe('los angeles');
  });

  it('drops bidi control characters that survive a copy paste from RTL text', () => {
    expect(normalize('‏תל אביב‎')).toBe('תל אביב');
  });
});

describe('tokenize', () => {
  it('splits on whitespace and keeps offsets into the original string', () => {
    const tokens = tokenize('בית ספר תל אביב');
    expect(tokens.map((t) => t.raw)).toEqual(['בית', 'ספר', 'תל', 'אביב']);
    expect(tokens.map((t) => [t.start, t.end])).toEqual([
      [0, 3],
      [4, 7],
      [8, 10],
      [11, 15],
    ]);
  });

  it('offsets address the original string, so a span can be cut back out of it', () => {
    const query = 'בית ספר תל אביב';
    const tokens = tokenize(query);
    expect(query.slice(tokens[2].start, tokens[3].end)).toBe('תל אביב');
  });

  it('splits on a maqaf', () => {
    expect(tokenize('בת־ים').map((t) => t.raw)).toEqual(['בת', 'ים']);
  });

  it('keeps an acronym with gershayim as one token', () => {
    const tokens = tokenize('צה״ל');
    expect(tokens.map((t) => t.raw)).toEqual(['צה״ל']);
    expect(tokens[0].normalized).toBe('צהל');
  });

  it('never emits an empty token from a leading or trailing separator', () => {
    expect(tokenize('  תל אביב, ').map((t) => t.raw)).toEqual(['תל', 'אביב']);
  });

  it('drops a token that is nothing but punctuation once normalized', () => {
    expect(tokenize('תל " אביב').map((t) => t.raw)).toEqual(['תל', 'אביב']);
  });

  it('treats bidi marks as separators so offsets stay exact', () => {
    const tokens = tokenize('‏תל אביב');
    expect(tokens.map((t) => t.raw)).toEqual(['תל', 'אביב']);
    expect(tokens[0].start).toBe(1);
  });

  it('splits on the punctuation the previous cleanQuery split on', () => {
    expect(tokenize('a.b/c-d').map((t) => t.raw)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('returns nothing for an empty or separator only query', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize('  ,. ')).toEqual([]);
  });
});

describe('generateSpans', () => {
  it('produces every contiguous n-gram, longest first', () => {
    const spans = generateSpans(tokenize('a bb cc'));
    expect(spans.map((s) => s.text)).toEqual(['a bb cc', 'a bb', 'bb cc', 'bb', 'cc']);
  });

  it('drops single character spans but keeps them inside longer ones', () => {
    const spans = generateSpans(tokenize('a bb'));
    expect(spans.map((s) => s.text)).toEqual(['a bb', 'bb']);
  });

  it('caps the span length', () => {
    const spans = generateSpans(tokenize('aa bb cc dd ee'));
    expect(Math.max(...spans.map((s) => s.tokenCount))).toBe(4);
  });

  it('caps harder once the query is long enough to be a sentence', () => {
    const long = Array.from({ length: 13 }, (_, i) => `w${i}`).join(' ');
    const spans = generateSpans(tokenize(long));
    expect(Math.max(...spans.map((s) => s.tokenCount))).toBe(3);
  });

  it('carries offsets that select the span from the original query', () => {
    const query = 'בית ספר תל אביב';
    const span = generateSpans(tokenize(query)).find((s) => s.text === 'תל אביב');
    expect(query.slice(span!.start, span!.end)).toBe('תל אביב');
  });

  it('gives every span a distinct id', () => {
    const spans = generateSpans(tokenize('aa bb cc'));
    expect(new Set(spans.map((s) => s.id)).size).toBe(spans.length);
  });

  it('normalizes the span text', () => {
    const spans = generateSpans(tokenize('רִאשׁוֹן לְצִיּוֹן'));
    expect(spans[0].text).toBe('ראשון לציון');
  });
});

describe('removeSpan', () => {
  it('cuts the span out of the original string', () => {
    const query = 'בית ספר תל אביב';
    const span = generateSpans(tokenize(query)).find((s) => s.text === 'תל אביב')!;
    expect(removeSpan(query, span)).toBe('בית ספר');
  });

  it('collapses the whitespace the cut leaves behind', () => {
    const query = 'airport los angeles port';
    const span = generateSpans(tokenize(query)).find((s) => s.text === 'los angeles')!;
    expect(removeSpan(query, span)).toBe('airport port');
  });

  it('returns an empty string when the span is the whole query', () => {
    const query = 'תל אביב';
    const span = generateSpans(tokenize(query)).find((s) => s.text === 'תל אביב')!;
    expect(removeSpan(query, span)).toBe('');
  });
});
