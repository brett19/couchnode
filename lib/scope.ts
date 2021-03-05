import { AnalyticsExecutor } from './analyticsexecutor'
import {
  AnalyticsMetaData,
  AnalyticsQueryOptions,
  AnalyticsResult,
} from './analyticstypes'
import { Bucket } from './bucket'
import { Collection } from './collection'
import { Connection } from './connection'
import {
  QueryExecutor,
} from './queryexecutor'
import { QueryMetaData, QueryOptions, QueryResult } from './querytypes'
import { StreamableRowPromise } from './streamablepromises'
import { Transcoder } from './transcoders'
import { NodeCallback, PromiseHelper } from './utilities'

/**
 * @category Core
 */
export class Scope {
  /**
   * @internal
   */
  static DEFAULT_NAME = '_default'

  private _bucket: Bucket
  private _name: string
  private _conn: Connection

  /**
  @internal
  */
  constructor(bucket: Bucket, scopeName: string) {
    this._bucket = bucket
    this._name = scopeName
    this._conn = bucket.conn
  }

  /**
  @internal
  */
  get conn(): Connection {
    return this._conn
  }

  /**
  @internal
  */
  get bucket(): Bucket {
    return this._bucket
  }

  /**
  @internal
  */
  get transcoder(): Transcoder {
    return this._bucket.transcoder
  }

  get name(): string {
    return this._name
  }

  collection(collectionName: string): Collection {
    return new Collection(this, collectionName)
  }

  query<TRow = any>(
    statement: string,
    options?: QueryOptions,
    callback?: NodeCallback<QueryResult<TRow>>
  ): StreamableRowPromise<QueryResult<TRow>, TRow, QueryMetaData> {
    if (options instanceof Function) {
      callback = arguments[0]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    const bucket = this.bucket
    const exec = new QueryExecutor(bucket.conn)

    const options_ = options
    return PromiseHelper.wrapAsync(
      () =>
        exec.query<TRow>(statement, {
          ...options_,
          queryContext: `${bucket.name}.${this.name}`,
        }),
      callback
    )
  }

  analyticsQuery<TRow = any>(
    statement: string,
    options?: AnalyticsQueryOptions,
    callback?: NodeCallback<AnalyticsResult<TRow>>
  ): StreamableRowPromise<AnalyticsResult<TRow>, TRow, AnalyticsMetaData> {
    if (options instanceof Function) {
      callback = arguments[0]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    const bucket = this.bucket
    const exec = new AnalyticsExecutor(bucket.conn)

    const options_ = options
    return PromiseHelper.wrapAsync(
      () =>
        exec.query<TRow>(statement, {
          ...options_,
          queryContext: `${bucket.name}.${this.name}`,
        }),
      callback
    )
  }
}
