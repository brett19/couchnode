import { Cluster } from './cluster'
import {
  BucketExistsError,
  BucketNotFoundError,
  CouchbaseError,
} from './errors'
import { DurabilityLevel } from './generaltypes'
import { HttpExecutor, HttpMethod, HttpServiceType } from './httpexecutor'
import {
  cbQsStringify,
  duraLevelToNsServerStr,
  NodeCallback,
  PromiseHelper,
} from './utilities'

/**
 * @category Management
 */
export const enum ConflictResolutionType {
  Timestamp = 'lww',
  SequenceNumber = 'seqno',
}

/**
 * @category Management
 */
export const enum BucketType {
  Couchbase = 'membase',
  Memcached = 'memcached',
  Ephemeral = 'ephemeral',
}

/**
 * @category Management
 */
export const enum EvictionPolicy {
  FullEviction = 'fullEviction',
  ValueOnly = 'valueOnly',
  NotRecentlyUsed = 'nruEviction',
  NoEviction = 'noEviction',
}

/**
 * @category Management
 */
export const enum CompressionMode {
  Off = 'off',
  Passive = 'passive',
  Active = 'active',
}

/**
 * @category Management
 */
export interface IBucketSettings {
  name: string
  flushEnabled: boolean
  ramQuotaMB: number
  numReplicas: number
  replicaIndexes: boolean
  bucketType: BucketType | string
  ejectionMethod: EvictionPolicy | string
  maxExpiry: number
  compressionMode: CompressionMode | string
  minimumDurabilityLevel: DurabilityLevel | string

  /**
   * @deprecated Use {@link IBucketSettings.maxExpiry} instead.
   */
  maxTTL: number

  /**
   * @deprecated Use {@link IBucketSettings.minimumDurabilityLevel} instead.
   */
  durabilityMinLevel: string
}

/**
 * @category Management
 */
export class BucketSettings implements IBucketSettings {
  name: string
  flushEnabled: boolean
  ramQuotaMB: number
  numReplicas: number
  replicaIndexes: boolean
  bucketType: BucketType
  ejectionMethod: EvictionPolicy
  maxExpiry: number
  compressionMode: CompressionMode
  minimumDurabilityLevel: DurabilityLevel

  constructor(data: BucketSettings) {
    this.name = data.name
    this.flushEnabled = data.flushEnabled
    this.ramQuotaMB = data.ramQuotaMB
    this.numReplicas = data.numReplicas
    this.numReplicas = data.numReplicas
    this.replicaIndexes = data.replicaIndexes
    this.bucketType = data.bucketType
    this.ejectionMethod = data.ejectionMethod
    this.maxExpiry = data.maxExpiry
    this.compressionMode = data.compressionMode
    this.minimumDurabilityLevel = data.minimumDurabilityLevel
  }

  get maxTTL(): number {
    return this.maxExpiry
  }

  get durabilityMinLevel(): string {
    return duraLevelToNsServerStr(this.minimumDurabilityLevel) as string
  }

  /**
   * @internal
   */
  static _toNsData(data: IBucketSettings): any {
    return {
      name: data.name,
      flushEnabled: data.flushEnabled,
      ramQuotaMB: data.ramQuotaMB,
      numReplicas: data.numReplicas,
      replicaIndexes: data.replicaIndexes,
      bucketType: data.bucketType,
      ejectionMethod: data.ejectionMethod,
      maxTTL: data.maxTTL || data.maxExpiry,
      compressionMode: data.compressionMode,
      durabilityMinLevel:
        data.durabilityMinLevel ||
        duraLevelToNsServerStr(data.minimumDurabilityLevel),
    }
  }
}

/**
 * @category Management
 */
export interface ICreateBucketSettings extends IBucketSettings {
  conflictResolutionType: ConflictResolutionType | string
}

// We intentionally do not export this class as it is never returned back
// to the user, but we still need the ability to translate to NS data.
class CreateBucketSettings
  extends BucketSettings
  implements ICreateBucketSettings {
  conflictResolutionType: ConflictResolutionType

  /**
   * @internal
   */
  constructor(data: CreateBucketSettings) {
    super(data)
    this.conflictResolutionType = data.conflictResolutionType
  }

  /**
   * @internal
   */
  static _toNsData(data: ICreateBucketSettings): any {
    return {
      ...BucketSettings._toNsData(data),
      conflictResolutionType: data.conflictResolutionType,
    }
  }
}

/**
 * @category Management
 */
export interface CreateBucketOptions {
  timeout?: number
}

/**
 * @category Management
 */
export interface UpdateBucketOptions {
  timeout?: number
}

/**
 * @category Management
 */
export interface DropBucketOptions {
  timeout?: number
}

/**
 * @category Management
 */
export interface GetBucketOptions {
  timeout?: number
}

/**
 * @category Management
 */
export interface GetAllBucketsOptions {
  timeout?: number
}

/**
 * @category Management
 */
export interface FlushBucketOptions {
  timeout?: number
}

/**
 * BucketManager provides an interface for adding/removing/updating
 * buckets within the cluster.
 *
 * @category Management
 */
export class BucketManager {
  private _cluster: Cluster

  /**
   * @internal
   */
  constructor(cluster: Cluster) {
    this._cluster = cluster
  }

  private get _http() {
    return new HttpExecutor(this._cluster._getClusterConn())
  }

  async createBucket(
    settings: CreateBucketSettings,
    options?: CreateBucketOptions,
    callback?: NodeCallback<void>
  ): Promise<void> {
    if (options instanceof Function) {
      callback = arguments[1]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    const timeout = options.timeout
    return PromiseHelper.wrapAsync(async () => {
      const bucketData = CreateBucketSettings._toNsData(settings)

      const res = await this._http.request({
        type: HttpServiceType.Management,
        method: HttpMethod.Post,
        path: `/pools/default/buckets`,
        contentType: 'application/x-www-form-urlencoded',
        body: cbQsStringify(bucketData),
        timeout: timeout,
      })

      if (res.statusCode !== 202) {
        const errCtx = HttpExecutor.errorContextFromResponse(res)

        const errText = res.body.toString().toLowerCase()
        if (errText.includes('already exists')) {
          throw new BucketExistsError(undefined, errCtx)
        }

        throw new CouchbaseError('failed to create bucket', undefined, errCtx)
      }
    }, callback)
  }

  async updateBucket(
    settings: BucketSettings,
    options?: UpdateBucketOptions,
    callback?: NodeCallback<void>
  ): Promise<void> {
    if (options instanceof Function) {
      callback = arguments[1]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    const timeout = options.timeout
    return PromiseHelper.wrapAsync(async () => {
      const bucketData = BucketSettings._toNsData(settings)

      const res = await this._http.request({
        type: HttpServiceType.Management,
        method: HttpMethod.Post,
        path: `/pools/default/buckets/${settings.name}`,
        contentType: 'application/x-www-form-urlencoded',
        body: cbQsStringify(bucketData),
        timeout: timeout,
      })

      if (res.statusCode !== 200) {
        const errCtx = HttpExecutor.errorContextFromResponse(res)

        const errText = res.body.toString().toLowerCase()
        if (errText.includes('not found')) {
          throw new BucketNotFoundError(undefined, errCtx)
        }

        throw new CouchbaseError('failed to update bucket', undefined, errCtx)
      }
    }, callback)
  }

  async dropBucket(
    bucketName: string,
    options?: DropBucketOptions,
    callback?: NodeCallback<void>
  ): Promise<void> {
    if (options instanceof Function) {
      callback = arguments[1]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    const timeout = options.timeout
    return PromiseHelper.wrapAsync(async () => {
      const res = await this._http.request({
        type: HttpServiceType.Management,
        method: HttpMethod.Delete,
        path: `/pools/default/buckets/${bucketName}`,
        timeout: timeout,
      })

      if (res.statusCode !== 200) {
        const errCtx = HttpExecutor.errorContextFromResponse(res)

        const errText = res.body.toString().toLowerCase()
        if (errText.includes('not found')) {
          throw new BucketNotFoundError(undefined, errCtx)
        }

        throw new CouchbaseError('failed to drop bucket', undefined, errCtx)
      }
    }, callback)
  }

  async getBucket(
    bucketName: string,
    options?: GetBucketOptions,
    callback?: NodeCallback<any>
  ): Promise<any> {
    if (options instanceof Function) {
      callback = arguments[1]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    const timeout = options.timeout
    return PromiseHelper.wrapAsync(async () => {
      const res = await this._http.request({
        type: HttpServiceType.Management,
        method: HttpMethod.Get,
        path: `/pools/default/buckets/${bucketName}`,
        timeout: timeout,
      })

      if (res.statusCode !== 200) {
        const errCtx = HttpExecutor.errorContextFromResponse(res)

        const errText = res.body.toString().toLowerCase()
        if (errText.includes('not found')) {
          throw new BucketNotFoundError(undefined, errCtx)
        }

        throw new CouchbaseError('failed to get bucket', undefined, errCtx)
      }

      return JSON.parse(res.body.toString())
    }, callback)
  }

  async getAllBuckets(
    options?: GetAllBucketsOptions,
    callback?: NodeCallback<any[]>
  ): Promise<any[]> {
    if (options instanceof Function) {
      callback = arguments[1]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    const timeout = options.timeout
    return PromiseHelper.wrapAsync(async () => {
      const res = await this._http.request({
        type: HttpServiceType.Management,
        method: HttpMethod.Get,
        path: `/pools/default/buckets`,
        timeout: timeout,
      })

      if (res.statusCode !== 200) {
        const errCtx = HttpExecutor.errorContextFromResponse(res)

        throw new CouchbaseError('failed to get buckets', undefined, errCtx)
      }

      return JSON.parse(res.body.toString())
    }, callback)
  }

  async flushBucket(
    bucketName: string,
    options?: FlushBucketOptions,
    callback?: NodeCallback<void>
  ): Promise<void> {
    if (options instanceof Function) {
      callback = arguments[1]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    const timeout = options.timeout
    return PromiseHelper.wrapAsync(async () => {
      const res = await this._http.request({
        type: HttpServiceType.Management,
        method: HttpMethod.Post,
        path: `/pools/default/buckets/${bucketName}/controller/doFlush`,
        timeout: timeout,
      })

      if (res.statusCode !== 200) {
        const errCtx = HttpExecutor.errorContextFromResponse(res)

        const errText = res.body.toString().toLowerCase()
        if (errText.includes('not found')) {
          throw new BucketNotFoundError(undefined, errCtx)
        }

        throw new CouchbaseError('failed to get bucket', undefined, errCtx)
      }
    }, callback)
  }
}
