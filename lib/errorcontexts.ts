import { Cas } from './utilities'

export class ErrorContext {}

/**
 * @category Error Handling
 */
export class KeyValueErrorContext extends ErrorContext {
  status_code: number
  opaque: number
  cas: Cas
  key: string
  bucket: string
  collection: string
  scope: string
  context: string
  ref: string

  /**
   * @internal
   */
  constructor(data: KeyValueErrorContext) {
    super()

    this.status_code = data.status_code
    this.opaque = data.opaque
    this.cas = data.cas
    this.key = data.key
    this.bucket = data.bucket
    this.collection = data.collection
    this.scope = data.scope
    this.context = data.context
    this.ref = data.ref
  }
}

/**
 * @category Error Handling
 */
export class ViewErrorContext extends ErrorContext {
  first_error_code: number
  first_error_message: string
  design_document: string
  view: string
  parameters: any
  http_response_code: number
  http_response_body: string

  /**
   * @internal
   */
  constructor(data: ViewErrorContext) {
    super()

    this.first_error_code = data.first_error_code
    this.first_error_message = data.first_error_message
    this.design_document = data.design_document
    this.view = data.view
    this.parameters = data.parameters
    this.http_response_code = data.http_response_code
    this.http_response_body = data.http_response_body
  }
}

/**
 * @category Error Handling
 */
export class QueryErrorContext extends ErrorContext {
  first_error_code: number
  first_error_message: string
  statement: string
  client_context_id: string
  parameters: any
  http_response_code: number
  http_response_body: string

  /**
   * @internal
   */
  constructor(data: QueryErrorContext) {
    super()

    this.first_error_code = data.first_error_code
    this.first_error_message = data.first_error_message
    this.statement = data.statement
    this.client_context_id = data.client_context_id
    this.parameters = data.parameters
    this.http_response_code = data.http_response_code
    this.http_response_body = data.http_response_body
  }
}

/**
 * @category Error Handling
 */
export class SearchErrorContext extends ErrorContext {
  error_message: string
  index_name: string
  query: any
  parameters: any
  http_response_code: number
  http_response_body: string

  /**
   * @internal
   */
  constructor(data: SearchErrorContext) {
    super()

    this.error_message = data.error_message
    this.index_name = data.index_name
    this.query = data.query
    this.parameters = data.parameters
    this.http_response_code = data.http_response_code
    this.http_response_body = data.http_response_body
  }
}

/**
 * @category Error Handling
 */
export class AnalyticsErrorContext extends ErrorContext {
  first_error_code: number
  first_error_message: string
  statement: string
  client_context_id: string
  parameters: any
  http_response_code: number
  http_response_body: string

  /**
   * @internal
   */
  constructor(data: QueryErrorContext) {
    super()

    this.first_error_code = data.first_error_code
    this.first_error_message = data.first_error_message
    this.statement = data.statement
    this.client_context_id = data.client_context_id
    this.parameters = data.parameters
    this.http_response_code = data.http_response_code
    this.http_response_body = data.http_response_body
  }
}

/**
 * @category Error Handling
 */
export class HttpErrorContext extends ErrorContext {
  method: string
  request_path: string
  response_code: number
  response_body: string

  /**
   * @internal
   */
  constructor(data: HttpErrorContext) {
    super()

    this.method = data.method
    this.request_path = data.request_path
    this.response_code = data.response_code
    this.response_body = data.response_body
  }
}

export type ValidErrorContext =
  | KeyValueErrorContext
  | ViewErrorContext
  | QueryErrorContext
  | SearchErrorContext
  | AnalyticsErrorContext
  | HttpErrorContext
