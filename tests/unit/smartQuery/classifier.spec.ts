import { classifyQuery } from '../../../src/smartQuery/models/classifier';
import type { IntentKind } from '../../../src/smartQuery/interfaces';

const kinds = (query: string): IntentKind[] => classifyQuery(query).intents.map((intent) => intent.kind);
const confidenceOf = (query: string, kind: IntentKind): number | undefined =>
  classifyQuery(query).intents.find((intent) => intent.kind === kind)?.confidence;

describe('classifyQuery', () => {
  describe('MGRS', () => {
    it('recognises a valid MGRS string and nothing else', () => {
      const { intents } = classifyQuery('18SUJ2338907395');
      expect(intents).toHaveLength(1);
      expect(intents[0]).toMatchObject({ kind: 'MGRS', confidence: 1, terms: { mgrs: '18SUJ2338907395' } });
    });

    it('does not treat a string that only looks like MGRS as MGRS', () => {
      // shaped like MGRS but mgrs.inverse rejects it
      expect(kinds('99ZZZ0000')).not.toContain('MGRS');
    });

    it('accepts a bare 100km square, which the mgrs library resolves', () => {
      // 18SUJ is a valid low precision reference; mgrs.inverse returns its corner, so the tile
      // lookup gets a real bbox rather than an error
      expect(kinds('18SUJ')).toEqual(['MGRS']);
    });

    it('rejects a zone letter the library cannot handle', () => {
      expect(kinds('99ZZZ0000')).not.toContain('MGRS');
    });
  });

  describe('tiles', () => {
    it('reads a tile and sub tile, preferring the sub tile', () => {
      const { intents } = classifyQuery('RIT 66');
      expect(intents[0]).toMatchObject({ kind: 'SUB_TILE', terms: { tile: 'RIT', subTile: '66' } });
      expect(kinds('RIT 66')).toEqual(['SUB_TILE', 'TILE']);
    });

    it('tolerates extra whitespace between the tile and the sub tile', () => {
      expect(classifyQuery('RIT   66').intents[0]).toMatchObject({ kind: 'SUB_TILE', terms: { tile: 'RIT', subTile: '66' } });
    });

    it('treats a short letter token as a tile, with a place as the weaker option', () => {
      expect(kinds('RIT')).toEqual(['TILE', 'PLACE']);
      expect(confidenceOf('RIT', 'TILE')).toBeGreaterThan(confidenceOf('RIT', 'PLACE')!);
    });

    it('accepts a two letter tile, which the control endpoint also allows', () => {
      expect(kinds('RI')).toContain('TILE');
    });
  });

  describe('digits', () => {
    it('reads digits as a control object name or a sub tile, never a place', () => {
      expect(kinds('1234')).toEqual(['CONTROL_NAME', 'SUB_TILE']);
      expect(kinds('1234')).not.toContain('PLACE');
    });

    it('carries the digits as the command name', () => {
      const [first] = classifyQuery('1234').intents;
      expect(first.kind).toBe('CONTROL_NAME');
      expect(first.kind === 'CONTROL_NAME' && first.terms.commandName).toBe('1234');
    });
  });

  describe('free text - the ambiguous case', () => {
    // There is no lexical signal separating a Hebrew OBJECT_COMMAND_NAME from a Hebrew place
    // name. Any heuristic here would silently drop a whole class of results, invisibly, because
    // the dropped side never appears in the response. The decision moves to retrieval instead.
    it('emits place and control name at exactly equal confidence for Hebrew free text', () => {
      const { intents } = classifyQuery('ציר אלון');
      expect(intents.map((i) => i.kind).sort()).toEqual(['CONTROL_NAME', 'PLACE']);
      expect(intents[0].confidence).toBe(intents[1].confidence);
    });

    it('emits place and control name at exactly equal confidence for multi word Latin text', () => {
      const { intents } = classifyQuery('via camillucciaA');
      expect(intents[0].confidence).toBe(intents[1].confidence);
    });

    it('passes the whole query through to both readings', () => {
      const { intents } = classifyQuery('בית ספר תל אביב');
      const carried = intents.map((intent) =>
        intent.kind === 'PLACE' ? intent.terms.text : intent.kind === 'CONTROL_NAME' ? intent.terms.commandName : undefined
      );
      expect(carried).toEqual(['בית ספר תל אביב', 'בית ספר תל אביב']);
    });
  });

  describe('contract', () => {
    it('never returns an empty intent list', () => {
      for (const query of ['RIT', 'RIT 66', '1234', '18SUJ2338907395', 'abc def', 'תל אביב', '00', 'a b c d e f']) {
        expect(classifyQuery(query).intents.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('orders intents by descending confidence', () => {
      for (const query of ['RIT', 'RIT 66', '1234', 'תל אביב']) {
        const confidences = classifyQuery(query).intents.map((intent) => intent.confidence);
        expect([...confidences].sort((a, b) => b - a)).toEqual(confidences);
      }
    });

    it('gives every intent a reason', () => {
      expect(classifyQuery('RIT 66').intents.every((intent) => intent.reason.length > 0)).toBe(true);
    });

    it('normalizes whitespace and non breaking spaces', () => {
      expect(classifyQuery('  RIT 66  ').normalizedQuery).toBe('RIT 66');
    });

    it('is a pure function of its input', () => {
      expect(classifyQuery('RIT 66')).toEqual(classifyQuery('RIT 66'));
    });
  });
});
