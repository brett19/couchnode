import { MutationState } from './mutationstate'
import { SearchFacet } from './searchfacet'
import { SearchSort } from './searchsort'

/**
 * SearchMetaData represents the meta-data available from a search query.
 * This class is currently incomplete and must be casted to `any` in
 * TypeScript to be used.
 *
 * @category Full Text Search
 */
export class SearchMetaData {}

/**
 * SearchRow represents the data available from a row of a search query.
 * This class is currently incomplete and must be casted to `any` in
 * TypeScript to be used.
 *
 * @category Full Text Search
 */
export class SearchRow {}

/**
 * @category Full Text Search
 */
export class SearchResult {
  rows: any[]
  meta: SearchMetaData

  /**
   * @internal
   */
  constructor(data: SearchResult) {
    this.rows = data.rows
    this.meta = data.meta
  }
}

/**
 * @category Full Text Search
 */
const enum HighlightStyle {
  HTML = 'html',
  ANSI = 'ansi',
}

/**
 * @category Full Text Search
 */
export const enum SearchScanConsistency {
  NotBounded = 'not_bounded',
  RequestPlus = 'request_plus',
}

/**
 * @category Full Text Search
 */
export interface SearchQueryOptions {
  skip?: number
  limit?: number
  explain?: boolean
  highlight?: {
    style?: HighlightStyle
    fields?: string[]
  }
  fields?: string[]
  facets?: SearchFacet[]
  sort?: string[] | SearchSort[]
  disableScoring?: boolean
  consistency?: SearchScanConsistency
  consistentWith?: MutationState
  timeout?: number
}
