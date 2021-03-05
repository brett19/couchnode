import { Cluster } from './cluster'
import { Collection } from './collection'
import { CollectionManager } from './collectionmanager'
import { Connection } from './connection'
import { PingExecutor } from './diagnosticsexecutor'
import { PingOptions, PingResult } from './diagnosticstypes'
import { Scope } from './scope'
import { StreamableRowPromise } from './streamablepromises'
import { Transcoder } from './transcoders'
import { NodeCallback, PromiseHelper } from './utilities'
import { ViewExecutor } from './viewexecutor'
import { ViewIndexManager } from './viewindexmanager'
import {
  ViewMetaData,
  ViewQueryOptions,
  ViewResult,
  ViewRow,
} from './viewtypes'

/**
 * @category Core
 */
export class Bucket {
  private _cluster: Cluster
  private _name: string
  private _conn: Connection

  /**
  @internal
  */
  constructor(cluster: Cluster, bucketName: string) {
    this._cluster = cluster
    this._name = bucketName
    this._conn = cluster._getConn({
      bucketName: bucketName,
    })
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
  get cluster(): Cluster {
    return this._cluster
  }

  /**
  @internal
  */
  get transcoder(): Transcoder {
    return this._cluster.transcoder
  }

  get name(): string {
    return this._name
  }

  scope(scopeName: string): Scope {
    return new Scope(this, scopeName)
  }

  defaultScope(): Scope {
    return this.scope(Scope.DEFAULT_NAME)
  }

  collection(collectionName: string): Collection {
    const scope = this.defaultScope()
    return scope.collection(collectionName)
  }

  defaultCollection(): Collection {
    return this.collection(Collection.DEFAULT_NAME)
  }

  viewIndexes(): ViewIndexManager {
    return new ViewIndexManager(this)
  }

  collections(): CollectionManager {
    return new CollectionManager(this)
  }

  viewQuery<TValue = any, TKey = any>(
    designDoc: string,
    viewName: string,
    options?: ViewQueryOptions,
    callback?: NodeCallback<ViewResult<TValue, TKey>>
  ): StreamableRowPromise<
    ViewResult<TValue, TKey>,
    ViewRow<TValue, TKey>,
    ViewMetaData
  > {
    if (options instanceof Function) {
      callback = arguments[0]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    const exec = new ViewExecutor(this.conn)

    const options_ = options
    return PromiseHelper.wrapAsync(
      () => exec.query<TValue, TKey>(designDoc, viewName, options_),
      callback
    )
  }

  ping(
    options?: PingOptions,
    callback?: NodeCallback<PingResult>
  ): Promise<PingResult> {
    if (options instanceof Function) {
      callback = arguments[0]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    const exec = new PingExecutor(this.conn)

    const options_ = options
    return PromiseHelper.wrapAsync(() => exec.ping(options_), callback)
  }
}
