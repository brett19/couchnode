/**
 * AnalyticsStatus represents the status of an analytics query.
 *
 * @category Analytics
 */
export const enum AnalyticsStatus {
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
 * AnalyticsResult contains the results of an analytics query.
 *
 * @category Analytics
 */
export class AnalyticsResult<TRow = any> {
  /**
   * The rows which have been returned by the query.
   */
  rows: TRow[]

  /**
   * The meta-data which has been returned by the query.
   */
  meta: AnalyticsMetaData

  /**
   * @internal
   */
  constructor(data: AnalyticsResult) {
    this.rows = data.rows
    this.meta = data.meta
  }
}

/**
 * AnalyticsMetaData contains the meta-data that is returend from
 * an analytics query.
 *
 * @category Analytics
 */
export class AnalyticsMetaData {
  /**
   * The request ID which is associated with the executed query.
   */
  requestId: string

  /**
   * The client context id which is assoicated with the executed query.
   */
  clientContextId: string

  /**
   * The status of the query at the time the query meta-data was generated.
   */
  status: AnalyticsStatus

  /**
   *
   */
  signature?: any

  /**
   * Any warnings that occurred during the execution of the query.
   */
  warnings: AnalyticsWarning[]

  /**
   * Various metrics which are made available by the query engine.
   */
  metrics: AnalyticsMetrics

  /**
   * @internal
   */
  constructor(data: AnalyticsMetaData) {
    this.requestId = data.requestId
    this.clientContextId = data.clientContextId
    this.status = data.status
    this.signature = data.signature
    this.warnings = data.warnings
    this.metrics = data.metrics
  }
}

/**
 * AnalyticsWarning contains information about a warning which occurred
 * during the execution of an analytics query.
 *
 * @category Analytics
 */
export class AnalyticsWarning {
  /**
   * The numeric code associated with the warning which occurred.
   */
  code: number

  /**
   * A human readable representation of the warning which occurred.
   */
  message: string

  /**
   * @internal
   */
  constructor(data: AnalyticsWarning) {
    this.code = data.code
    this.message = data.message
  }
}

/**
 * AnalyticsMetrics contains various metrics that are returned by the
 * server following the execution of an analytics query.
 *
 * @category Analytics
 */
export class AnalyticsMetrics {
  /**
   * The total amount of time spent running the query, in milliseconds.
   */
  elapsedTime: number

  /**
   * The total amount of time spent executing the query, in milliseconds.
   */
  executionTime: number

  /**
   * The total number of rows which were part of the result set.
   */
  resultCount: number

  /**
   * The total number of bytes which were generated as part of the result set.
   */
  resultSize: number

  /**
   * The total number of errors which were encountered during the execution of the query.
   */
  errorCount: number

  /**
   * The total number of objects that were processed as part of execution of the query.
   */
  processedObjects: number

  /**
   * The total number of warnings which were encountered during the execution of the query.
   */
  warningCount: number

  /**
   * @internal
   */
  constructor(data: AnalyticsMetrics) {
    this.elapsedTime = data.elapsedTime
    this.executionTime = data.executionTime
    this.resultCount = data.resultCount
    this.resultSize = data.resultSize
    this.errorCount = data.errorCount
    this.processedObjects = data.processedObjects
    this.warningCount = data.warningCount
  }
}

/**
 * @category Analytics
 */
export const enum AnalyticsScanConsistency {
  NotBounded = 'not_bounded',
  RequestPlus = 'request_plus',
}

/**
 * @category Analytics
 */
export interface AnalyticsQueryOptions {
  /**
   * Values to be used for the placeholders within the query.
   */
  parameters?: { [key: string]: any } | any[]

  /**
   * Specifies the consistency requirements when executing the query.
   *
   * @see AnalyticsScanConsistency
   */
  scanConsistency?: AnalyticsScanConsistency

  /**
   * The returned client context id for this query.
   */
  clientContextId?: string

  /**
   * Indicates whether this query should be executed with a specific priority level.
   */
  priority?: boolean

  /**
   * Indicates whether this query should be executed in read-only mode.
   */
  readOnly?: boolean

  /**
   * Specifies the context within which this query should be executed.  This can be
   * scoped to a scope or a collection within the dataset.
   */
  queryContext?: string

  /**
   * Specifies any additional parameters which should be passed to the query engine
   * when executing the query.
   */
  raw?: { [key: string]: any }

  /**
   * The timeout for this operation, represented in milliseconds.
   */
  timeout?: number
}
