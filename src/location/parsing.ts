//This file might be deprecated in the future
/* istanbul ignore file */
import { XMLParser } from 'fast-xml-parser';

interface Highlight {
  em: string | string[];
  '#text': string;
}

const HIERARCHY_OF_INTEREST = 3;

const HIGHLIGHT_XML_REGEX = /<em>|<\/em>/gi;

const untagHighlight = (highlight: string) => highlight.replace(HIGHLIGHT_XML_REGEX, '');

const calculateHighlightQuality = (highlight: string, queryWordCount: number): number => {
  const parser = new XMLParser({ numberParseOptions: { skipLike: /[0-9]+/, hex: false, leadingZeros: false } });
  const parsed = parser.parse(highlight) as Highlight;

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

export const generateDisplayName = (highlights: string[], queryWordCount: number, name?: string): string | undefined => {
  const scored = highlights.map((highlight) => ({
    highlight,
    quality: calculateHighlightQuality(highlight, queryWordCount),
  }));
  const filtered = scored.filter(name ? ({ highlight }) => highlight.includes(name) : ({ quality }) => quality < 1);

  const chosen = (filtered.length ? filtered : scored).sort(compareQualityThenLength).pop()?.highlight;

  return chosen && untagHighlight(chosen);
};

export const getHierarchyOfInterest = (hierarchy: string): string => hierarchy.split('/')[HIERARCHY_OF_INTEREST];
