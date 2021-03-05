/**
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
 * @category Analytics
 */
export class AnalyticsResult<TRow = any> {
  rows: TRow[]
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
 * @category Analytics
 */
export class AnalyticsMetaData {
  requestId: string
  clientContextId: string
  status: AnalyticsStatus
  signature?: any
  warnings: AnalyticsWarning[]
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
 * @category Analytics
 */
export class AnalyticsWarning {
  code: number
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
 * @category Analytics
 */
export class AnalyticsMetrics {
  elapsedTime: number
  executionTime: number
  resultCount: number
  resultSize: number
  errorCount: number
  processedObjects: number
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
  parameters?: { [key: string]: any } | any[]
  scanConsistency?: AnalyticsScanConsistency
  clientContextId?: string
  priority?: boolean
  readOnly?: boolean
  queryContext?: string
  raw?: { [key: string]: any }
  timeout?: number
}
