import { aggregateSubwords, longestContiguousName, reconstructs } from '../../../../src/location/placeResolution/subwords';

describe('aggregateSubwords', () => {
  describe('word-level input (no SentencePiece marker)', () => {
    // The deployed mock, and every existing fixture, send and receive whitespace tokens.
    // Aggregation must be a no-op for them or it would silently rewrite current behaviour.
    it('passes word-level tokens through untouched', () => {
      expect(aggregateSubwords(['new', 'york'], ['essence', 'name'])).toEqual({
        words: ['new', 'york'],
        labels: ['essence', 'name'],
      });
    });

    it('passes a single word through untouched', () => {
      expect(aggregateSubwords(['airport'], ['essence'])).toEqual({ words: ['airport'], labels: ['essence'] });
    });
  });

  describe('sub-word input (SentencePiece marker present)', () => {
    // Every expectation below is the measured output of xlm-roberta-base (see A0-evidence.txt).
    it('strips the marker when pieces map 1:1 to words', () => {
      expect(aggregateSubwords(['▁תל', '▁אביב'], ['name', 'name'])).toEqual({
        words: ['תל', 'אביב'],
        labels: ['name', 'name'],
      });
    });

    it('merges a fragmented word and takes the first piece label', () => {
      // פתח תקווה -> ['▁פתח', '▁תק', 'ווה']
      expect(aggregateSubwords(['▁פתח', '▁תק', 'ווה'], ['essence', 'name', 'name'])).toEqual({
        words: ['פתח', 'תקווה'],
        labels: ['essence', 'name'],
      });
    });

    it('treats a bare marker piece as the start of the word that follows it', () => {
      // צה״ל -> ['▁', 'צה', '״', 'ל'] : one word, not four
      expect(aggregateSubwords(['▁', 'צה', '״', 'ל'], ['essence', 'name', 'name', 'name'])).toEqual({
        words: ['צה״ל'],
        labels: ['name'],
      });
    });

    it('handles a bare marker in the middle of a multi word phrase', () => {
      // אום אל פחם -> ['▁אום', '▁אל', '▁', 'פח', 'ם']
      expect(aggregateSubwords(['▁אום', '▁אל', '▁', 'פח', 'ם'], ['name', 'name', 'name', 'name', 'name'])).toEqual({
        words: ['אום', 'אל', 'פחם'],
        labels: ['name', 'name', 'name'],
      });
    });

    it('merges punctuation pieces back into one word', () => {
      // בת־ים -> ['▁בת', '־', 'ים']
      expect(aggregateSubwords(['▁בת', '־', 'ים'], ['name', 'name', 'name'])).toEqual({
        words: ['בת־ים'],
        labels: ['name'],
      });
    });

    it('merges the english cases that fragment', () => {
      // los angeles -> ['▁los', '▁angel', 'es']
      expect(aggregateSubwords(['▁los', '▁angel', 'es'], ['name', 'name', 'name'])).toEqual({
        words: ['los', 'angeles'],
        labels: ['name', 'name'],
      });
    });

    it('starts a word when the first piece carries no marker', () => {
      expect(aggregateSubwords(['תל', '▁אביב'], ['name', 'name'])).toEqual({
        words: ['תל', 'אביב'],
        labels: ['name', 'name'],
      });
    });
  });

  describe('malformed input', () => {
    it('returns undefined when tokens and predictions have different lengths', () => {
      expect(aggregateSubwords(['▁a', 'b'], ['name'])).toBeUndefined();
    });

    it('returns undefined for empty input', () => {
      expect(aggregateSubwords([], [])).toBeUndefined();
    });

    it('drops pieces that are empty once the marker is stripped', () => {
      expect(aggregateSubwords(['▁', '▁תל'], ['essence', 'name'])).toEqual({ words: ['תל'], labels: ['name'] });
    });
  });
});

describe('longestContiguousName', () => {
  it('returns the contiguous run of name labels', () => {
    expect(longestContiguousName(['בית', 'ספר', 'תל', 'אביב'], ['essence', 'essence', 'name', 'name'])).toBe('תל אביב');
  });

  it('never joins non adjacent name tokens', () => {
    // the current implementation returns "a c"; a name is one span, not a bag of words
    expect(longestContiguousName(['a', 'b', 'c'], ['name', 'essence', 'name'])).toBe('a');
  });

  it('prefers the longer run when runs differ in length', () => {
    expect(longestContiguousName(['a', 'b', 'c', 'd'], ['name', 'essence', 'name', 'name'])).toBe('c d');
  });

  it('returns the whole phrase when every token is a name', () => {
    expect(longestContiguousName(['תל', 'אביב'], ['name', 'name'])).toBe('תל אביב');
  });

  it('returns an empty string when nothing is labelled name', () => {
    expect(longestContiguousName(['airport'], ['essence'])).toBe('');
  });
});

describe('reconstructs', () => {
  it('accepts an aggregation that preserves every character', () => {
    expect(reconstructs(['אום', 'אל', 'פחם'], ['אום', 'אל', 'פחם'])).toBe(true);
  });

  it('accepts a different word split that keeps the same characters', () => {
    expect(reconstructs(['בת־ים'], ['בת', '־ים'])).toBe(true);
  });

  it('rejects an aggregation that dropped a character', () => {
    expect(reconstructs(['תל', 'אביב'], ['תל', 'אבי'])).toBe(false);
  });

  it('tolerates a tokeniser that changes case', () => {
    expect(reconstructs(['New', 'York'], ['\u2581new', '\u2581york'])).toBe(true);
  });

  it('ignores the leftover marker and whitespace differences', () => {
    expect(reconstructs(['תל אביב'], ['▁תל', '▁אביב'])).toBe(true);
  });
});
