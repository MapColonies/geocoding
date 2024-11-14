//This file might be deprecated in the future
/* istanbul ignore file */
import { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { XMLParser } from 'fast-xml-parser';
import { IApplication } from '../common/interfaces';
import { TextSearchParams } from './interfaces';
import { TextSearchHit } from './models/elasticsearchHits';

const HIERARCHY_OF_INTEREST = 3;

const HIGHLIGHT_XML_REGEX = /<em>|<\/em>/gi;

const untagHighlight = (highlight: string): string => highlight.replace(HIGHLIGHT_XML_REGEX, '');

const calculateHighlightQuality = (highlight: string, queryWordCount: number): number => {
  const parser = new XMLParser({ numberParseOptions: { skipLike: /[0-9]+/, hex: false, leadingZeros: false } });
  const parsed = parser.parse(highlight) as NonNullable<SearchHit['highlight']>;

  if (!(parsed.em instanceof Array)) {
    parsed.em = [parsed.em];
  }

  const taggedCount = parsed.em.map((element) => element.split(' ')).flat().length;

  return taggedCount / queryWordCount;
};

const compareQualityThenLength = (
  a: {
    highlight: string;
    quality: number;
  },
  b: {
    highlight: string;
    quality: number;
  }
): number => a.quality - b.quality || a.highlight.length - b.highlight.length;

const generateDisplayNameFromHighlight = (
  { text: highlights }: NonNullable<SearchHit['highlight']>,
  queryWordCount: number,
  name?: string
): string => {
  const scored = highlights.map((highlight) => ({
    highlight,
    quality: calculateHighlightQuality(highlight, queryWordCount),
  }));
  const filtered = scored.filter(name !== undefined ? ({ highlight }): boolean => highlight.includes(name) : ({ quality }): boolean => quality < 1);

  const chosen = (filtered.length ? filtered : scored).sort(compareQualityThenLength).pop()!.highlight;

  return untagHighlight(chosen);
};

export const generateDisplayName = (
  highlight: SearchHit['highlight'],
  params: TextSearchParams,
  feature: TextSearchHit,
  sources?: IApplication['sources']
): string => {
  return `${highlight ? generateDisplayNameFromHighlight(highlight, params.query.split(' ').length, params.name) : feature.name}, ${
    feature.placetype
  }, ${feature.sub_placetype}, ${feature.region[0]}, ${feature.sub_region[0] ? feature.sub_region[0] + ', ' : ''}${
    sources?.[feature.source] ?? feature.source
  }`;
};

export const getHierarchyOfInterest = (hierarchy: string): string => hierarchy.split('/')[HIERARCHY_OF_INTEREST];
