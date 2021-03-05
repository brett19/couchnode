import { MutationState } from './mutationstate'

/**
 * @category Query
 */
export const enum QueryStatus {
  Running = 'running',
  Success = 'success',
  Errors = 'errors',
  Completed = 'completed',
  Stopped = 'stopped',
  Timeout = 'timeout',
  Closed = 'closed',
  Fatal = 'fatal',
  Aborted = 'aborted',
  Unknown = 'unknown',
}

/**
 * @category Query
 */
export class QueryResult<TRow = any> {
  rows: TRow[]
  meta: QueryMetaData

  /**
   * @internal
   */
  constructor(data: QueryResult) {
    this.rows = data.rows
    this.meta = data.meta
  }
}

/**
 * @category Query
 */
export class QueryMetaData {
  requestId: string
  clientContextId: string
  status: QueryStatus
  signature?: any
  warnings: QueryWarning[]
  metrics?: QueryMetrics
  profile?: any

  /**
   * @internal
   */
  constructor(data: QueryMetaData) {
    this.requestId = data.requestId
    this.clientContextId = data.clientContextId
    this.status = data.status
    this.signature = data.signature
    this.warnings = data.warnings
    this.metrics = data.metrics
    this.profile = data.profile
  }
}

/**
 * @category Query
 */
export class QueryWarning {
  code: number
  message: string

  /**
   * @internal
   */
  constructor(data: QueryWarning) {
    this.code = data.code
    this.message = data.message
  }
}

/**
 * @category Query
 */
export class QueryMetrics {
  elapsedTime: number
  executionTime: number
  sortCount: number
  resultCount: number
  resultSize: number
  mutationCount: number
  errorCount: number
  warningCount: number

  /**
   * @internal
   */
  constructor(data: QueryMetrics) {
    this.elapsedTime = data.elapsedTime
    this.executionTime = data.executionTime
    this.sortCount = data.sortCount
    this.resultCount = data.resultCount
    this.resultSize = data.resultSize
    this.mutationCount = data.mutationCount
    this.errorCount = data.errorCount
    this.warningCount = data.warningCount
  }
}

/**
 * @category Query
 */
export const enum QueryProfileMode {
  Off = 'off',
  Phases = 'phases',
  Timings = 'timings',
}

/**
 * @category Query
 */
export const enum QueryScanConsistency {
  NotBounded = 'not_bounded',
  RequestPlus = 'request_plus',
}

/**
 * @category Query
 */
export interface QueryOptions {
  parameters?: { [key: string]: any } | any[]
  scanConsistency?: QueryScanConsistency
  consistentWith?: MutationState
  adhoc?: boolean
  flexIndex?: boolean
  clientContextId?: string
  maxParallelism?: number
  pipelineBatch?: number
  pipelineCap?: number
  scanWait?: number
  scanCap?: number
  readOnly?: boolean
  profile?: QueryProfileMode
  metrics?: boolean
  queryContext?: string
  raw?: { [key: string]: any }
  timeout?: number
}
