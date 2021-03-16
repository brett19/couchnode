import { AnalyticsExecutor } from './analyticsexecutor'
import { AnalyticsIndexManager } from './analyticsindexmanager'
import {
  AnalyticsMetaData,
  AnalyticsQueryOptions,
  AnalyticsResult,
} from './analyticstypes'
import {
  Authenticator,
  PasswordAuthenticator,
  CertificateAuthenticator,
} from './authenticators'
import { Bucket } from './bucket'
import { BucketManager } from './bucketmanager'
import { Connection, ConnectionOptions } from './connection'
import { DiagnoticsExecutor, PingExecutor } from './diagnosticsexecutor'
import {
  DiagnosticsOptions,
  DiagnosticsResult,
  PingOptions,
  PingResult,
} from './diagnosticstypes'
import { ClusterClosedError, NeedOpenBucketError } from './errors'
import { libLogger } from './logging'
import { LogFunc, defaultLogger } from './logging'
import { QueryExecutor } from './queryexecutor'
import { QueryIndexManager } from './queryindexmanager'
import { QueryMetaData, QueryOptions, QueryResult } from './querytypes'
import { SearchExecutor } from './searchexecutor'
import { SearchIndexManager } from './searchindexmanager'
import { SearchQuery } from './searchquery'
import {
  SearchMetaData,
  SearchQueryOptions,
  SearchResult,
  SearchRow,
} from './searchtypes'
import { StreamableRowPromise } from './streamablepromises'
import { Transcoder, DefaultTranscoder } from './transcoders'
import { UserManager } from './usermanager'
import { PromiseHelper, NodeCallback } from './utilities'

/**
 * @category Core
 */
export interface ConnectOptions {
  username?: string
  password?: string
  authenticator?: Authenticator
  trustStorePath?: string
  kvTimeout?: number
  kvDurableTimeout?: number
  viewTimeout?: number
  queryTimeout?: number
  analyticsTimeout?: number
  searchTimeout?: number
  managementTimeout?: number
  transcoder?: Transcoder
  logFunc?: LogFunc
}

/**
 * @category Core
 */
export class Cluster {
  private _connStr: string
  private _trustStorePath: string
  private _kvTimeout: number
  private _kvDurableTimeout: number
  private _viewTimeout: number
  private _queryTimeout: number
  private _analyticsTimeout: number
  private _searchTimeout: number
  private _managementTimeout: number
  private _auth: Authenticator
  private _closed: boolean
  private _clusterConn: Connection | null
  private _conns: { [key: string]: Connection }
  private _transcoder: Transcoder
  private _logFunc: LogFunc

  /**
  @internal
  */
  get transcoder(): Transcoder {
    return this._transcoder
  }

  /**
  @internal
  */
  constructor(connStr: string, options?: ConnectOptions) {
    if (!options) {
      options = {}
    }

    this._connStr = connStr
    this._trustStorePath = options.trustStorePath || ''
    this._kvTimeout = options.kvTimeout || 0
    this._kvDurableTimeout = options.kvDurableTimeout || 0
    this._viewTimeout = options.viewTimeout || 0
    this._queryTimeout = options.queryTimeout || 0
    this._analyticsTimeout = options.analyticsTimeout || 0
    this._searchTimeout = options.searchTimeout || 0
    this._managementTimeout = options.managementTimeout || 0

    if (options.transcoder) {
      this._transcoder = options.transcoder
    } else {
      this._transcoder = new DefaultTranscoder()
    }

    if (options.logFunc) {
      this._logFunc = options.logFunc
    } else {
      this._logFunc = defaultLogger
    }

    if (options.username || options.password) {
      if (options.authenticator) {
        throw new Error(
          'Cannot specify authenticator along with username/password.'
        )
      }

      this._auth = {
        username: options.username || '',
        password: options.password || '',
      }
    } else if (options.authenticator) {
      this._auth = options.authenticator
    } else {
      this._auth = {
        username: '',
        password: '',
      }
    }

    this._closed = false
    this._clusterConn = null
    this._conns = {}
  }

  /**
  @internal
  */
  static async connect(
    connStr: string,
    options?: ConnectOptions,
    callback?: NodeCallback<Cluster>
  ): Promise<Cluster> {
    return PromiseHelper.wrapAsync(async () => {
      const cluster = new Cluster(connStr, options)
      await cluster._clusterConnect()
      return cluster
    }, callback)
  }

  bucket(bucketName: string): Bucket {
    return new Bucket(this, bucketName)
  }

  users(): UserManager {
    return new UserManager(this)
  }

  buckets(): BucketManager {
    return new BucketManager(this)
  }

  queryIndexes(): QueryIndexManager {
    return new QueryIndexManager(this)
  }

  analyticsIndexes(): AnalyticsIndexManager {
    return new AnalyticsIndexManager(this)
  }

  searchIndexes(): SearchIndexManager {
    return new SearchIndexManager(this)
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

    const conn = this._getClusterConn()
    const exec = new QueryExecutor(conn)

    const options_ = options
    return PromiseHelper.wrapAsync(
      () => exec.query<TRow>(statement, options_),
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

    const conn = this._getClusterConn()
    const exec = new AnalyticsExecutor(conn)

    const options_ = options
    return PromiseHelper.wrapAsync(
      () => exec.query<TRow>(statement, options_),
      callback
    )
  }

  searchQuery(
    indexName: string,
    query: SearchQuery,
    options?: SearchQueryOptions,
    callback?: NodeCallback<SearchResult>
  ): StreamableRowPromise<SearchResult, SearchRow, SearchMetaData> {
    if (options instanceof Function) {
      callback = arguments[0]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    const conn = this._getClusterConn()
    const exec = new SearchExecutor(conn)

    const options_ = options
    return PromiseHelper.wrapAsync(
      () => exec.query(indexName, query, options_),
      callback
    )
  }

  diagnostics(
    options?: DiagnosticsOptions,
    callback?: NodeCallback<DiagnosticsResult>
  ): Promise<DiagnosticsResult> {
    if (options instanceof Function) {
      callback = arguments[0]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    let conns = Object.values(this._conns)
    if (this._clusterConn) {
      conns = [...conns, this._clusterConn]
    }

    const exec = new DiagnoticsExecutor(conns)

    const options_ = options
    return PromiseHelper.wrapAsync(() => exec.diagnostics(options_), callback)
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

    const conn = this._getClusterConn()
    const exec = new PingExecutor(conn)

    const options_ = options
    return PromiseHelper.wrapAsync(() => exec.ping(options_), callback)
  }

  close(callback?: NodeCallback<void>): Promise<void> {
    return PromiseHelper.wrapAsync(async () => {
      const closeOneConn = async (conn: Connection) => {
        return PromiseHelper.wrap<void>((wrapCallback) => {
          conn.close(wrapCallback)
        })
      }

      let allConns = Object.values(this._conns)
      this._conns = {}

      if (this._clusterConn) {
        allConns = [...allConns, this._clusterConn]
        this._clusterConn = null
      }

      this._closed = true

      await Promise.all(allConns.map((conn) => closeOneConn(conn)))
    }, callback)
  }

  private _buildConnOpts(
    extraOpts: Partial<ConnectionOptions>
  ): ConnectionOptions {
    const connOpts = {
      connStr: this._connStr,
      trustStorePath: this._trustStorePath,
      logFunc: this._logFunc,
      kvTimeout: this._kvTimeout,
      kvDurableTimeout: this._kvDurableTimeout,
      viewTimeout: this._viewTimeout,
      queryTimeout: this._queryTimeout,
      analyticsTimeout: this._analyticsTimeout,
      searchTimeout: this._searchTimeout,
      managementTimeout: this._managementTimeout,
      ...extraOpts,
    }

    if (this._auth) {
      const passAuth = this._auth as PasswordAuthenticator
      if (passAuth.username || passAuth.password) {
        connOpts.username = passAuth.username
        connOpts.password = passAuth.password
      }

      const certAuth = this._auth as CertificateAuthenticator
      if (certAuth.certificatePath || certAuth.keyPath) {
        connOpts.certificatePath = certAuth.certificatePath
        connOpts.keyPath = certAuth.keyPath
      }
    }

    return connOpts
  }

  private async _clusterConnect() {
    return new Promise((resolve, reject) => {
      const connOpts = this._buildConnOpts({})
      const conn = new Connection(connOpts)

      conn.connect((err) => {
        if (err) {
          return reject(err)
        }

        this._clusterConn = conn
        resolve(null)
      })
    })
  }

  /**
  @internal
  */
  _getClusterConn(): Connection {
    if (this._closed) {
      throw new ClusterClosedError()
    }

    if (this._clusterConn) {
      return this._clusterConn
    }

    const conns = Object.values(this._conns)
    if (conns.length === 0) {
      throw new NeedOpenBucketError()
    }

    return conns[0]
  }

  /**
  @internal
  */
  _getConn(options: { bucketName: string }): Connection {
    if (this._closed) {
      throw new ClusterClosedError()
    }

    // Hijack the cluster-level connection if it is available
    if (this._clusterConn) {
      this._clusterConn.close(() => {
        // TODO(brett19): Handle the close error here...
      })
      this._clusterConn = null
      /*
      let conn = this._clusterConn;
      this._clusterConn = null;

      conn.selectBucket(opts.bucketName);

      this._conns[bucketName] = conn;
      return conn;
      */
    }

    // Build a new connection for this, since there is no
    // cluster-level connection available.
    const connOpts = this._buildConnOpts({
      bucketName: options.bucketName,
    })

    let conn = this._conns[options.bucketName]

    if (!conn) {
      conn = new Connection(connOpts)

      conn.connect((err: Error | null) => {
        if (err) {
          libLogger('failed to connect to bucket: %O', err)
          conn.close(() => undefined)
        }
      })

      this._conns[options.bucketName] = conn
    }

    return conn
  }
}
