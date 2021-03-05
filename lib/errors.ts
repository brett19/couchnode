import './errorcontexts'
import { ErrorContext, ValidErrorContext } from './errorcontexts'

/**
 * @category Error Handling
 */
export class CouchbaseError extends Error {
  cause: Error | undefined
  context: ValidErrorContext | undefined

  constructor(message: string, cause?: Error, context?: ErrorContext) {
    super(message)
    this.name = this.constructor.name

    this.cause = cause
    this.context = context as ValidErrorContext | undefined
  }
}

/**
 * @category Error Handling
 */
export class ConnectionClosedError extends CouchbaseError {
  constructor() {
    super('The connection has been closed.')
  }
}

/**
 * @category Error Handling
 */
export class ClusterClosedError extends CouchbaseError {
  constructor() {
    super('The parent cluster object has been closed.')
  }
}

/**
 * @category Error Handling
 */
export class NeedOpenBucketError extends CouchbaseError {
  constructor() {
    super('You must have one open bucket before you can perform queries.')
  }
}

/**
 * @category Error Handling
 */
export class InvalidDurabilityLevel extends CouchbaseError {
  constructor() {
    super('An invalid durability level was specified.')
  }
}

/**
 * @category Error Handling
 */
export class TimeoutError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('timeout', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class RequestCanceledError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('request canceled', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class InvalidArgumentError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('invalid argument', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class ServiceNotAvailableError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('service not available', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class InternalServerFailureError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('internal server failure', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class AuthenticationFailureError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('authentication failure', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class TemporaryFailureError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('temporary failure', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class ParsingFailureError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('parsing failure', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class CasMismatchError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('cas mismatch', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class BucketNotFoundError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('bucket not found', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class CollectionNotFoundError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('collection not found', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class EncodingFailureError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('encoding failure', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class DecodingFailureError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('decoding failure', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class UnsupportedOperationError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('unsupported operation', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class AmbiguousTimeoutError extends TimeoutError {
  constructor(cause?: Error, context?: ErrorContext) {
    super(cause, context)
    this.message = 'ambiguous timeout'
  }
}

/**
 * @category Error Handling
 */
export class UnambiguousTimeoutError extends TimeoutError {
  constructor(cause?: Error, context?: ErrorContext) {
    super(cause, context)
    this.message = 'unambiguous timeout'
  }
}

/**
 * @category Error Handling
 */
export class FeatureNotAvailableError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('feature not available', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class ScopeNotFoundError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('scope not found', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class IndexNotFoundError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('index not found', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class IndexExistsError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('index exists', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class DocumentNotFoundError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('document not found', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class DocumentUnretrievableError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('document unretrievable', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class DocumentLockedError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('document locked', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class ValueTooLargeError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('value too large', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class DocumentExistsError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('document exists', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class ValueNotJsonError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('value not json', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class DurabilityLevelNotAvailableError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('durability level not available', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class DurabilityImpossibleError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('durability impossible', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class DurabilityAmbiguousError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('durability ambiguous', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class DurableWriteInProgressError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('durable write in progress', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class DurableWriteReCommitInProgressError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('durable write recommit in progress', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class MutationLostError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('mutation lost', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class PathNotFoundError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('path not found', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class PathMismatchError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('path mismatch', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class PathInvalidError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('path invalid', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class PathTooBigError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('path too big', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class PathTooDeepError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('path too deep', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class ValueTooDeepError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('value too deep', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class ValueInvalidError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('value invalid', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class DocumentNotJsonError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('document not json', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class NumberTooBigError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('number too big', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class DeltaInvalidError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('delta invalid', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class PathExistsError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('path exists', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class PlanningFailureError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('planning failure', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class IndexFailureError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('index failure', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class PreparedStatementFailureError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('prepared statement failure', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class CompilationFailureError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('compilation failure', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class JobQueueFullError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('job queue full', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class DatasetNotFoundError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('dataset not found', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class DataverseNotFoundError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('dataverse not found', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class DatasetExistsError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('dataset exists', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class DataverseExistsError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('dataverse exists', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class LinkNotFoundError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('link not found', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class ViewNotFoundError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('view not found', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class DesignDocumentNotFoundError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('design document not found', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class CollectionExistsError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('collection exists', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class ScopeExistsError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('scope exists', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class UserNotFoundError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('user not found', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class GroupNotFoundError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('group not found', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class BucketExistsError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('bucket exists', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class UserExistsError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('user exists', cause, context)
  }
}

/**
 * @category Error Handling
 */
export class BucketNotFlushableError extends CouchbaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('bucket not flushable', cause, context)
  }
}
