import { ServiceType } from './generaltypes'

/**
 * PingResult represents the output of a ping operation.  This class is
 * currently incomplete and must be casted to `any` in TypeScript to be used.
 *
 * @category Diagnostics
 */
export class PingResult {}

/**
 * @category Diagnostics
 */
export interface PingOptions {
  reportId?: string
  serviceTypes?: ServiceType
  timeout?: number
}

/**
 * DiagnosticsResult represents the output of a operation result.  This
 * class is currently incomplete and must be casted to `any` in TypeScript
 * to be used.
 *
 * @category Diagnostics
 */
export class DiagnosticsResult {}

/**
 * @category Diagnostics
 */
export interface DiagnosticsOptions {
  reportId?: string
}
