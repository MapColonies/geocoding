import { PLACE_FANOUT_MIN_CONFIDENCE } from '../constants';
import type { Classification, IntentKind, SourceWeights } from '../interfaces';

/** Intents the control index can answer. */
const CONTROL_KINDS: IntentKind[] = ['TILE', 'SUB_TILE', 'CONTROL_NAME'];

interface Backends {
  control: boolean;
  places: boolean;
  mgrsTiles: boolean;
}

const confidenceOf = (classification: Classification, kinds: IntentKind[]): number =>
  classification.intents.reduce((best, intent) => (kinds.includes(intent.kind) ? Math.max(best, intent.confidence) : best), 0);

/**
 * Which backends to ask.
 *
 * A valid MGRS string answers itself, so it short-circuits to the tile lookup. Otherwise the
 * control index is asked whenever any control intent survived, and the places backend only when
 * a place is plausible enough to be worth the round trip - which is why digits never reach it.
 */
const decideBackends = (classification: Classification): Backends => {
  const mgrsTiles = classification.intents.some((intent) => intent.kind === 'MGRS');

  if (mgrsTiles) {
    return { control: false, places: false, mgrsTiles: true };
  }

  return {
    control: confidenceOf(classification, CONTROL_KINDS) > 0,
    places: confidenceOf(classification, ['PLACE']) >= PLACE_FANOUT_MIN_CONFIDENCE,
    mgrsTiles: false,
  };
};

/**
 * How much each source's ranking is trusted, taken straight from the intent priors.
 *
 * This is what makes a confident tile query return tiles only, without needing a per-source
 * quota in the merge - a quota would paper over a weighting mistake and make the output order
 * untestable.
 */
const sourceWeights = (classification: Classification): SourceWeights => ({
  control: confidenceOf(classification, CONTROL_KINDS),
  places: confidenceOf(classification, ['PLACE']),
});

export { decideBackends, sourceWeights, CONTROL_KINDS };
export type { Backends };
