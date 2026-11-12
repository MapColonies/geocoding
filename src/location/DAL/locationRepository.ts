import { Logger } from '@map-colonies/js-logger';
import { estypes } from '@elastic/elasticsearch';
import { FactoryFunction } from 'tsyringe';
import { ElasticClient, ElasticClients } from '../../common/elastic';
import { fetchNLPService } from '../utils';
import { TextSearchParams, TokenResponse } from '../interfaces';
import { PlaceTypeSearchHit, HierarchySearchHit, TextSearchHit } from '../models/elasticsearchHits';
import { BadRequestError } from '../../common/errors';
import { IApplication } from '../../common/interfaces';
import { queryElastic } from '../../common/elastic/utils';
import { SERVICES } from '../../common/constants';
import { CommonSpanAttributes, withSpan } from '../../common/tracing';
import { LocationSpanName, LocationAttributes } from '../tracing';
import { isPlausiblePlacetype } from '../placeResolution/score';
import type { CandidateHit } from '../placeResolution/score';
import { aggregateSubwords, longestContiguousName, reconstructs } from '../placeResolution/subwords';
import { tokenize } from '../placeResolution/tokenize';
import type { CandidateSpan } from '../placeResolution/types';
import { hierarchyQuery, placetypeQuery, geotextQuery, placeCandidatesQuery } from './queries';

const FIND_QUOTES = /["']/g;

const FIND_SPECIAL = /[`!@#$%^&*()_\-+=|\\/,.<>:[\]{}\n\t\r\s;؛]+/g;
const cleanQuery = (query: string): string[] => query.replace(FIND_QUOTES, '').split(FIND_SPECIAL);

/** Reported as `nlp_anlyser_latency_ms` when the analyser could not be reached - the signal to alert on. */
const NLP_UNAVAILABLE_LATENCY = -1;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const createGeotextRepository = (client: ElasticClient, logger: Logger) => {
  return {
    async extractName(endpoint: string, query: string): Promise<{ name: string; latency: number }> {
      return withSpan(
        LocationSpanName.REPOSITORY_EXTRACT_NAME,
        { attributes: { [LocationAttributes.QUERY]: query, [LocationAttributes.NLP_ENDPOINT]: endpoint } },
        async (span) => {
          const tokensRaw = cleanQuery(query);

          let nlpResponse: { data: Partial<TokenResponse>[]; latency: number };
          try {
            nlpResponse = await fetchNLPService<Partial<TokenResponse>>(endpoint, { tokens: tokensRaw });
          } catch (error: unknown) {
            // The name is a ranking hint, not a requirement - a missing analyser must not fail the search.
            logger.warn({ msg: 'extractName: NLP analyser unavailable, continuing without a name hint', error });
            span?.setAttribute(LocationAttributes.QUERY_NAME, '');
            return { name: '', latency: NLP_UNAVAILABLE_LATENCY };
          }

          const { data: response, latency } = nlpResponse;
          const { tokens, prediction } = response[0];

          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
          if (!tokens?.length || !prediction?.length) {
            const message = 'No tokens or prediction';
            logger.error({ msg: message });
            throw new BadRequestError(message);
          }

          // The analyser is a RoBERTa token classifier, so it returns SentencePiece pieces rather
          // than words. Reading labels against the raw pieces yields fragments - "ווה" for פתח תקווה.
          const aggregated = aggregateSubwords(tokens, prediction);

          if (!aggregated) {
            logger.warn({
              msg: 'extractName: NLP analyser returned misaligned tokens and predictions, ignoring the name hint',
              tokenCount: tokens.length,
              predictionCount: prediction.length,
            });
            span?.setAttribute(LocationAttributes.QUERY_NAME, '');
            return { name: '', latency };
          }

          if (!reconstructs(aggregated.words, tokensRaw)) {
            logger.warn({ msg: 'extractName: NLP analyser tokens do not reconstruct the query, ignoring the name hint', sent: tokensRaw });
            span?.setAttribute(LocationAttributes.QUERY_NAME, '');
            return { name: '', latency };
          }

          const name = longestContiguousName(aggregated.words, aggregated.labels);

          span?.setAttribute(LocationAttributes.QUERY_NAME, name);

          return { name, latency };
        }
      );
    },

    async generatePlacetype(
      index: string,
      query: string,
      disableFuzziness: boolean
    ): Promise<{
      placeTypes: string[];
      subPlaceTypes: string[];
      matchLatencyMs: number;
    }> {
      return withSpan(
        LocationSpanName.REPOSITORY_GENERATE_PLACETYPE,
        {
          attributes: {
            [LocationAttributes.QUERY]: query,
            [LocationAttributes.DISABLE_FUZZINESS]: disableFuzziness,
            [CommonSpanAttributes.ELASTIC_INDEX]: index,
          },
        },
        async (span) => {
          const {
            hits: { hits },
            took: matchLatencyMs,
          } = await queryElastic<PlaceTypeSearchHit>(client, { index, ...placetypeQuery(query, disableFuzziness) });

          // An Elasticsearch _score has no absolute scale, so a score floor cannot tell a real
          // placetype from a fuzzy accident. Compare the placetype to the words actually typed.
          const queryTokens = tokenize(query).map((token) => token.normalized);
          const accepted = hits.filter((hit) => isPlausiblePlacetype(hit._source!.sub_placetype_keyword, queryTokens));

          const SCORE_DIFFERENCE_THRESHOLD = 0.5;
          const MIN_HITS_FOR_DIFFERENCE_CHECK = 2;

          if (accepted.length == MIN_HITS_FOR_DIFFERENCE_CHECK && accepted[0]._score! - accepted[1]._score! > SCORE_DIFFERENCE_THRESHOLD) {
            accepted.pop();
          }

          const [placeTypes, subPlaceTypes] = accepted.reduce<[string[], string[]]>(
            ([placeTypes, subPlaceTypes], hit) => [placeTypes.concat(hit._source!.placetype), subPlaceTypes.concat(hit._source!.sub_placetype)],
            [[], []]
          );

          span?.setAttributes({
            [LocationAttributes.PLACE_TYPES]: placeTypes,
            [LocationAttributes.SUB_PLACE_TYPES]: subPlaceTypes,
            [CommonSpanAttributes.MATCH_LATENCY_MS]: matchLatencyMs,
          });

          return {
            placeTypes,
            subPlaceTypes,
            matchLatencyMs,
          };
        }
      );
    },

    /**
     * Asks the gazetteer about every candidate span in one request.
     *
     * I/O only: the clause names come back on each hit and the caller grades them. Elasticsearch
     * reports `matched_queries` either as a list of names or, when scores are requested, as a
     * name-to-score object, so both shapes are accepted.
     */
    async findPlaceCandidates(
      index: string,
      spans: CandidateSpan[],
      disableFuzziness: boolean
    ): Promise<{ candidates: CandidateHit[]; matchLatencyMs: number }> {
      return withSpan(
        LocationSpanName.REPOSITORY_FIND_PLACE_CANDIDATES,
        {
          attributes: {
            [LocationAttributes.DISABLE_FUZZINESS]: disableFuzziness,
            [LocationAttributes.PLACE_SPANS_COUNT]: spans.length,
            [CommonSpanAttributes.ELASTIC_INDEX]: index,
          },
        },
        async (span) => {
          if (spans.length === 0) {
            return { candidates: [], matchLatencyMs: 0 };
          }

          const {
            hits: { hits },
            took: matchLatencyMs,
          } = await queryElastic<HierarchySearchHit>(client, { index, ...placeCandidatesQuery(spans, disableFuzziness) });

          const candidates = hits.map((hit) => {
            const matched = hit.matched_queries as string[] | Record<string, number> | undefined;

            return {
              hit: hit._source!,
              score: hit._score ?? 0,
              matchedQueries: Array.isArray(matched) ? matched : Object.keys(matched ?? {}),
            };
          });

          span?.setAttributes({
            [LocationAttributes.PLACE_CANDIDATES_COUNT]: candidates.length,
            [CommonSpanAttributes.MATCH_LATENCY_MS]: matchLatencyMs,
          });

          return { candidates, matchLatencyMs };
        }
      );
    },

    async extractHierarchy(
      index: string,
      query: string,
      hierarchyBoost: number,
      disableFuzziness: boolean
    ): Promise<{ hierarchies: HierarchySearchHit[]; matchLatencyMs: number }> {
      return withSpan(
        LocationSpanName.REPOSITORY_EXTRACT_HIERARCHY,
        {
          attributes: {
            [LocationAttributes.QUERY]: query,
            [LocationAttributes.DISABLE_FUZZINESS]: disableFuzziness,
            [CommonSpanAttributes.ELASTIC_INDEX]: index,
          },
        },
        async (span) => {
          const {
            hits: { hits },
            took: matchLatencyMs,
          } = await queryElastic<HierarchySearchHit>(client, { index, ...hierarchyQuery(query, disableFuzziness) });

          const MIN_HITS_THRESHOLD = 3;

          const filteredHits = hits.length > MIN_HITS_THRESHOLD ? hits.filter((hit) => hit._score! >= hits[2]._score!) : hits;

          const highestScore = Math.max(...filteredHits.map((hit) => hit._score!));
          const hierarchies = filteredHits.map((hit) => ({
            ...hit._source!,
            weight: (hit._score! / highestScore) * (hierarchyBoost - 1) + 1,
          }));

          span?.setAttributes({
            [LocationAttributes.HIERARCHIES_COUNT]: hierarchies.length,
            [CommonSpanAttributes.MATCH_LATENCY_MS]: matchLatencyMs,
          });

          return { hierarchies, matchLatencyMs };
        }
      );
    },

    async geotextSearch(
      index: string,
      params: TextSearchParams,
      textLanguage: string,
      elasticQueryBoosts: IApplication['elasticQueryBoosts'],
      geotextLayerName?: { geotextCitiesLayer?: IApplication['geotextCitiesLayer']; roadPlaceTypes?: IApplication['roadPlaceTypes'] }
    ): Promise<estypes.SearchResponse<TextSearchHit>> {
      return withSpan(
        LocationSpanName.REPOSITORY_GEOTEXT_SEARCH,
        {
          attributes: {
            [LocationAttributes.QUERY_NAME]: params.name,
            [CommonSpanAttributes.ELASTIC_INDEX]: index,
          },
        },
        async (span) => {
          const response = await queryElastic<TextSearchHit>(client, {
            index,
            ...geotextQuery(params, textLanguage, elasticQueryBoosts, geotextLayerName),
          });

          span?.setAttributes({
            [CommonSpanAttributes.RESULT_COUNT]: response.hits.hits.length,
            [CommonSpanAttributes.MATCH_LATENCY_MS]: response.took,
          });

          return response;
        }
      );
    },
  };
};

export type GeotextRepository = ReturnType<typeof createGeotextRepository>;

export const geotextRepositoryFactory: FactoryFunction<GeotextRepository> = (depContainer) => {
  return createGeotextRepository(
    depContainer.resolve<ElasticClients>(SERVICES.ELASTIC_CLIENTS).geotext,
    depContainer.resolve<Logger>(SERVICES.LOGGER)
  );
};

export const GEOTEXT_REPOSITORY_SYMBOL = Symbol('GEOTEXT_REPOSITORY_SYMBOL');

export { NLP_UNAVAILABLE_LATENCY };
