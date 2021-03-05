/**
 * @category Views
 */
export class ViewResult<TValue = any, TKey = any> {
  rows: ViewRow<TKey, TValue>[]
  meta: ViewMetaData

  /**
   * @internal
   */
  constructor(data: ViewResult) {
    this.rows = data.rows
    this.meta = data.meta
  }
}

/**
 * @category Views
 */
export class ViewMetaData {
  totalRows: number
  debug?: any

  /**
   * @internal
   */
  constructor(data: { totalRows: number; debug?: any }) {
    this.totalRows = data.totalRows
    this.debug = data.debug
  }

  /**
   * @deprecated Use {@link ViewMetaData.totalRows} instead.
   */
  get total_rows(): number {
    return this.totalRows
  }
}

/**
 * @category Views
 */
export class ViewRow<TValue = any, TKey = any> {
  value: TValue
  key?: TKey
  id?: string

  /**
   * @internal
   */
  constructor(data: ViewRow) {
    this.value = data.value
    this.key = data.key
    this.id = data.id
  }
}

/**
 * @category Views
 */
export const enum ViewScanConsistency {
  RequestPlus = 'false',
  UpdateAfter = 'update_after',
  NotBounded = 'ok',
}

/**
 * @category Views
 */
export const enum ViewOrdering {
  Ascending = 'false',
  Descending = 'true',
}

/**
 * @category Views
 */
export const enum ViewErrorMode {
  Continue = 'continue',
  Stop = 'stop',
}

/**
 * @category Views
 */
export interface ViewQueryKeyRange {
  start?: string | string[]
  end?: string | string[]
  inclusiveEnd?: boolean

  /**
   * @deprecated Use {@link ViewQueryKeyRange.inclusiveEnd} instead.
   */
  inclusive_end?: boolean
}

/**
 * @category Views
 */
export interface ViewQueryIdRange {
  start?: string
  end?: string
}

/**
 * @category Views
 */
export interface ViewQueryOptions {
  scanConsistency?: ViewScanConsistency
  skip?: number
  limit?: number
  order?: ViewOrdering
  reduce?: string
  group?: boolean
  groupLevel?: number
  key?: string
  keys?: string[]
  range?: ViewQueryKeyRange
  idRange?: ViewQueryIdRange
  fullSet?: boolean
  onError?: ViewErrorMode
  timeout?: number

  /**
   * @deprecated Use {@link ViewQueryOptions.scanConsistency} instead.
   */
  stale?: string | ViewScanConsistency
  /**
   * @deprecated Use {@link ViewQueryOptions.groupLevel} instead.
   */
  group_level?: number
  /**
   * @deprecated Use {@link ViewQueryOptions.idRange} instead.
   */
  id_range?: ViewQueryIdRange
  /**
   * @deprecated Use {@link ViewQueryOptions.fullSet} instead.
   */
  full_set?: boolean
  /**
   * @deprecated Use {@link ViewQueryOptions.onError} instead.
   */
  on_error?: ViewErrorMode
}
