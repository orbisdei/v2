// Re-export shim → @orbisdei/shared/src/topicFacets (matches lib/types,
// lib/imageUrl, lib/interestFilter, lib/countries).

export {
  deriveTopicFacets,
  filterSitesByTopics,
  splitFacets,
  isTopicTag,
  parseTopicsParam,
  serializeTopicsParam,
  MIN_INLINE_FACET_COUNT,
  DEFAULT_INLINE_FACET_LIMIT,
  type TopicFacet,
} from '@orbisdei/shared/src/topicFacets';
