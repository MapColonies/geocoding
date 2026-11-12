import type { HierarchySearchHit } from '../models/elasticsearchHits';

/** A token of the raw query, carrying the offsets needed to cut it back out of the original string. */
interface QueryToken {
  /** The original substring, separators excluded. */
  raw: string;
  /** Normalized for comparison: NFC, diacritics stripped, lowercased. */
  normalized: string;
  /** Character offset of `raw` in the original query. */
  start: number;
  /** Character offset one past the end of `raw`. */
  end: number;
}

/** A contiguous run of tokens offered to the gazetteer as a possible place name. */
interface CandidateSpan {
  /** Stable identifier, used to name the Elasticsearch clause this span produced. */
  id: string;
  /** Normalized, space joined text of the span - what is sent to Elasticsearch and compared locally. */
  text: string;
  /** Character offsets in the original query, for cutting the span out of it. */
  start: number;
  end: number;
  /** Index of the first token, and how many tokens the span covers. */
  tokenStart: number;
  tokenCount: number;
}

/** A gazetteer entry that one span matched, with the evidence used to score it. */
interface PlaceCandidate {
  hit: HierarchySearchHit;
  span: CandidateSpan;
  /** 1 exact, 0.8 the entry contains the span, 0.5 fuzzy only. */
  exactness: number;
  confidence: number;
  score: number;
}

/** The place a query resolved to, and how it should constrain the search. */
interface ResolvedPlace {
  hit: HierarchySearchHit;
  span: CandidateSpan;
  confidence: number;
  mode: 'filter' | 'boost';
}

export type { QueryToken, CandidateSpan, PlaceCandidate, ResolvedPlace };
