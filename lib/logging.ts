import debug from 'debug'

/**
 * @category Logging
 */
export enum LogSeverity {
  Trace,
  Debug,
  Info,
  Warn,
  Error,
  Fatal,
}

/**
 * @category Logging
 */
export interface LogData {
  severity: LogSeverity
  srcFile: string
  srcLine: number
  subsys: string
  message: string
}

/**
 * @category Logging
 */
export interface LogFunc {
  (data: LogData): void
}

const libLogger = debug('couchnode')
const severityLoggers = {
  [LogSeverity.Trace]: libLogger.extend('trace'),
  [LogSeverity.Debug]: libLogger.extend('debug'),
  [LogSeverity.Info]: libLogger.extend('info'),
  [LogSeverity.Warn]: libLogger.extend('warn'),
  [LogSeverity.Error]: libLogger.extend('error'),
  [LogSeverity.Fatal]: libLogger.extend('fatal'),
}
function _logSevToLogger(severity: LogSeverity) {
  // We cache our loggers above since some versions of the debug library
  // incur an disproportional cost (or leak memory) for calling extend.
  const logger = severityLoggers[severity]
  if (logger) {
    return logger
  }

  // We still call extend if there is an unexpected severity, this shouldn't
  // really happen though...
  return libLogger.extend('sev' + severity)
}

function logToDebug(data: LogData): void {
  const logger = _logSevToLogger(data.severity)
  const location = data.srcFile + ':' + data.srcLine
  logger('(' + data.subsys + ' @ ' + location + ') ' + data.message)
}

/**
 * @category Logging
 */
export const defaultLogger: LogFunc = logToDebug
