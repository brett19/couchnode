import { Bucket } from './bucket'
import {
  CollectionExistsError,
  CollectionNotFoundError,
  CouchbaseError,
  FeatureNotAvailableError,
  ScopeExistsError,
  ScopeNotFoundError,
} from './errors'
import { HttpExecutor, HttpMethod, HttpServiceType } from './httpexecutor'
import { cbQsStringify, NodeCallback, PromiseHelper } from './utilities'

/**
 * @category Management
 */
export interface ICollectionSpec {
  name: string
  scopeName: string
  maxExpiry?: number
}

// This is intentionally unexported as we don't return it to the user.
class CollectionSpec {
  static _toNsData(data: ICollectionSpec): any {
    return {
      name: data.name,
      maxTTL: data.maxExpiry,
    }
  }
}

/**
 * @category Management
 */
export interface CreateCollectionOptions {
  timeout?: number
}

/**
 * @category Management
 */
export interface GetAllScopesOptions {
  timeout?: number
}

/**
 * @category Management
 */
export interface DropCollectionOptions {
  timeout?: number
}

/**
 * @category Management
 */
export interface CreateScopeOptions {
  timeout?: number
}

/**
 * @category Management
 */
export interface DropScopeOptions {
  timeout?: number
}

/**
 * CollectionManager allows the management of collections within a Bucket.
 *
 * @category Management
 */
export class CollectionManager {
  private _bucket: Bucket

  /**
   * @internal
   */
  constructor(bucket: Bucket) {
    this._bucket = bucket
  }

  private get _http() {
    return new HttpExecutor(this._bucket.conn)
  }

  /**
   * @deprecated
   */
  async createCollection(
    collectionName: string,
    scopeName: string,
    options?: CreateCollectionOptions,
    callback?: NodeCallback<void>
  ): Promise<void>

  async createCollection(
    collectionSpec: ICollectionSpec,
    options?: CreateCollectionOptions,
    callback?: NodeCallback<void>
  ): Promise<void>

  /**
   * @internal
   */
  async createCollection(): Promise<void> {
    let collectionSpec: ICollectionSpec = arguments[0]
    let options: CreateCollectionOptions | undefined = arguments[1]
    let callback: NodeCallback<void> | undefined = arguments[2]

    // Deprecated usage conversion for (name, scopeName, options, callback)
    if (typeof collectionSpec === 'string') {
      collectionSpec = {
        name: arguments[0],
        scopeName: arguments[1],
      }
      options = arguments[2]
      callback = arguments[3]
    }

    if (options instanceof Function) {
      callback = arguments[2]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    const bucketName = this._bucket.name
    const timeout = options.timeout
    return PromiseHelper.wrapAsync(async () => {
      const collectionData = CollectionSpec._toNsData(collectionSpec)

      const res = await this._http.request({
        type: HttpServiceType.Management,
        method: HttpMethod.Post,
        path: `/pools/default/buckets/${bucketName}/collections/${collectionSpec.scopeName}`,
        contentType: 'application/x-www-form-urlencoded',
        body: cbQsStringify(collectionData),
        timeout: timeout,
      })

      if (res.statusCode !== 200) {
        const errCtx = HttpExecutor.errorContextFromResponse(res)

        const errText = res.body.toString().toLowerCase()
        if (
          errText.includes('not allowed on this version of cluster') ||
          res.statusCode === 404
        ) {
          throw new FeatureNotAvailableError(undefined, errCtx)
        }
        if (
          errText.includes('already exists') &&
          errText.includes('collection')
        ) {
          throw new CollectionExistsError(undefined, errCtx)
        }
        if (errText.includes('not found') && errText.includes('scope')) {
          throw new ScopeNotFoundError(undefined, errCtx)
        }

        throw new CouchbaseError(
          'failed to create collection',
          undefined,
          errCtx
        )
      }
    }, callback)
  }

  async dropCollection(
    collectionName: string,
    scopeName: string,
    options?: DropCollectionOptions,
    callback?: NodeCallback<void>
  ): Promise<void> {
    if (options instanceof Function) {
      callback = arguments[2]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    const bucketName = this._bucket.name
    const timeout = options.timeout
    return PromiseHelper.wrapAsync(async () => {
      const res = await this._http.request({
        type: HttpServiceType.Management,
        method: HttpMethod.Delete,
        path: `/pools/default/buckets/${bucketName}/collections/${scopeName}/${collectionName}`,
        timeout: timeout,
      })

      if (res.statusCode !== 200) {
        const errCtx = HttpExecutor.errorContextFromResponse(res)

        const errText = res.body.toString().toLowerCase()
        if (
          errText.includes('not allowed on this version of cluster') ||
          res.statusCode === 404
        ) {
          throw new FeatureNotAvailableError(undefined, errCtx)
        }
        if (errText.includes('not found') && errText.includes('collection')) {
          throw new CollectionNotFoundError(undefined, errCtx)
        }

        throw new CouchbaseError('failed to drop collection', undefined, errCtx)
      }
    }, callback)
  }

  async createScope(
    scopeName: string,
    options?: CreateScopeOptions,
    callback?: NodeCallback<void>
  ): Promise<void> {
    if (options instanceof Function) {
      callback = arguments[1]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    const bucketName = this._bucket.name
    const timeout = options.timeout
    return PromiseHelper.wrapAsync(async () => {
      const res = await this._http.request({
        type: HttpServiceType.Management,
        method: HttpMethod.Post,
        path: `/pools/default/buckets/${bucketName}/collections`,
        contentType: 'application/x-www-form-urlencoded',
        body: cbQsStringify({
          name: scopeName,
        }),
        timeout: timeout,
      })

      if (res.statusCode !== 200) {
        const errCtx = HttpExecutor.errorContextFromResponse(res)

        const errText = res.body.toString().toLowerCase()
        if (
          errText.includes('not allowed on this version of cluster') ||
          res.statusCode === 404
        ) {
          throw new FeatureNotAvailableError(undefined, errCtx)
        }
        if (errText.includes('already exists') && errText.includes('scope')) {
          throw new ScopeExistsError(undefined, errCtx)
        }

        throw new CouchbaseError('failed to create scope', undefined, errCtx)
      }
    }, callback)
  }

  async dropScope(
    scopeName: string,
    options?: DropScopeOptions,
    callback?: NodeCallback<void>
  ): Promise<void> {
    if (options instanceof Function) {
      callback = arguments[2]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    const bucketName = this._bucket.name
    const timeout = options.timeout
    return PromiseHelper.wrapAsync(async () => {
      const res = await this._http.request({
        type: HttpServiceType.Management,
        method: HttpMethod.Delete,
        path: `/pools/default/buckets/${bucketName}/collections/${scopeName}`,
        timeout: timeout,
      })

      if (res.statusCode !== 200) {
        const errCtx = HttpExecutor.errorContextFromResponse(res)

        const errText = res.body.toString().toLowerCase()
        if (
          errText.includes('not allowed on this version of cluster') ||
          res.statusCode === 404
        ) {
          throw new FeatureNotAvailableError(undefined, errCtx)
        }
        if (errText.includes('not found') && errText.includes('scope')) {
          throw new ScopeNotFoundError(undefined, errCtx)
        }

        throw new CouchbaseError('failed to drop scope', undefined, errCtx)
      }
    }, callback)
  }
}
