import { estypes } from '@elastic/elasticsearch';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { ELASTIC_KEYWORDS } from '../../control/constants';
import { geoContextQuery } from '../../common/utils';
import type { CommonRequestParameters } from '../../common/interfaces';
import type { ConvertSnakeToCamelCase } from '../../common/utils';
import type { QueryIntent } from '../interfaces';

/** Fuzziness the existing control queries use. */
const CONTROL_FUZZINESS = 1;
const CONTROL_PREFIX_LENGTH = 1;

const matchOn = (field: string, value: string, disableFuzziness: boolean): QueryDslQueryContainer => ({
  match: {
    [field]: {
      query: value,
      fuzziness: disableFuzziness ? undefined : CONTROL_FUZZINESS,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      prefix_length: CONTROL_PREFIX_LENGTH,
    },
  },
});

/** One clause per live intent, mirroring the dedicated control queries field for field. */
const typeBranchFor = (intent: QueryIntent, disableFuzziness: boolean): QueryDslQueryContainer | undefined => {
  switch (intent.kind) {
    case 'TILE':
      return {
        bool: {
          must: [{ term: { [ELASTIC_KEYWORDS.type]: 'TILE' } }, matchOn(ELASTIC_KEYWORDS.tileName, intent.terms.tile, disableFuzziness)],
        },
      };

    case 'SUB_TILE':
      return {
        bool: {
          must: [
            { term: { [ELASTIC_KEYWORDS.type]: 'SUB_TILE' } },
            ...(intent.terms.tile !== undefined ? [{ term: { [ELASTIC_KEYWORDS.tileName]: intent.terms.tile } }] : []),
            matchOn(ELASTIC_KEYWORDS.subTileId, intent.terms.subTile, disableFuzziness),
          ],
        },
      };

    case 'CONTROL_NAME':
      // Deliberately unconstrained by TYPE: this matches ITEM, ROUTE and the control points
      // alike. `queryForControlPointInRoute` cannot answer a bare control point number at all,
      // because it requires the owning route; this does, and returns the ITEM carrying TIED_TO.
      return matchOn(ELASTIC_KEYWORDS.objectCommandName, intent.terms.commandName, disableFuzziness);

    // MGRS and PLACE are answered elsewhere; they never reach the control index.
    case 'MGRS':
    case 'PLACE':
      return undefined;
  }
};

/**
 * Every control object kind in one Elasticsearch call.
 *
 * The type branches are nested inside `must` rather than spread beside `geoContextQuery`. In
 * bias mode that helper returns `{ should: [...] }`, which at the same level would overwrite the
 * branches - and adding `minimum_should_match` to compensate would turn the bias clause into a
 * hard requirement.
 */
const queryForControlAnyType = ({
  intents,
  geoContext,
  geoContextMode,
  disableFuzziness,
}: ConvertSnakeToCamelCase<CommonRequestParameters> & { intents: QueryIntent[] }): estypes.SearchRequest => {
  const typeBranches = intents
    .map((intent) => typeBranchFor(intent, disableFuzziness))
    .filter((branch): branch is QueryDslQueryContainer => branch !== undefined);

  return {
    query: {
      bool: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        must: [{ bool: { should: typeBranches, minimum_should_match: 1 } }],
        ...geoContextQuery(geoContext, geoContextMode),
      },
    },
  };
};

export { queryForControlAnyType };
