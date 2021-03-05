import { Bucket } from './bucket'
import { CouchbaseError, DesignDocumentNotFoundError } from './errors'
import { HttpExecutor, HttpMethod, HttpServiceType } from './httpexecutor'
import { CompoundTimeout, NodeCallback, PromiseHelper } from './utilities'

/**
 * @category Management
 */
export class DesignDocumentView {
  map: string
  reduce: string | undefined

  constructor(data: { map: string; reduce?: string }) {
    this.map = data.map
    this.reduce = data.reduce
  }
}

/**
 * @category Management
 */
export class DesignDocument {
  /**
   * @deprecated Use {@link DesignDocumentView} directly.
   */
  static get View(): any {
    return DesignDocumentView
  }

  name: string
  views: { [viewName: string]: DesignDocumentView }

  constructor(data: {
    name: string
    views?: { [viewName: string]: DesignDocumentView }
  }) {
    this.name = data.name
    this.views = data.views || {}
  }

  /**
   * @internal
   */
  static _fromNsData(ddocName: string, ddocData: any): DesignDocument {
    const views: { [viewName: string]: DesignDocumentView } = {}
    for (const viewName in ddocData.views) {
      const viewData = ddocData.views[viewName]
      views[viewName] = new DesignDocumentView({
        map: viewData.map,
        reduce: viewData.reduce,
      })
    }

    return new DesignDocument({ name: ddocName, views: views })
  }
}

/**
 * @category Management
 */
export interface GetAllDesignDocumentOptions {
  timeout?: number
}

/**
 * @category Management
 */
export interface GetDesignDocumentOptions {
  timeout?: number
}

/**
 * @category Management
 */
export interface UpsertDesignDocumentOptions {
  timeout?: number
}

/**
 * @category Management
 */
export interface DropDesignDocumentOptions {
  timeout?: number
}

/**
 * @category Management
 */
export interface PublishDesignDocumentOptions {
  timeout?: number
}

/**
 * ViewIndexManager is an interface which enables the management
 * of view indexes on the cluster.
 *
 * @category Management
 */
export class ViewIndexManager {
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

  async getAllDesignDocuments(
    options?: GetAllDesignDocumentOptions,
    callback?: NodeCallback<DesignDocument[]>
  ): Promise<DesignDocument[]> {
    if (options instanceof Function) {
      callback = arguments[0]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    const timeout = options.timeout
    return PromiseHelper.wrapAsync(async () => {
      const bucketName = this._bucket.name

      const res = await this._http.request({
        type: HttpServiceType.Management,
        method: HttpMethod.Get,
        path: `/pools/default/buckets/${bucketName}/ddocs`,
        timeout: timeout,
      })

      if (res.statusCode !== 200) {
        const errCtx = HttpExecutor.errorContextFromResponse(res)

        throw new CouchbaseError(
          'failed to get design documents',
          undefined,
          errCtx
        )
      }

      const ddocsData = JSON.parse(res.body.toString())

      const ddocs = ddocsData.rows.map((ddocData: any) => {
        const ddocName = ddocData.doc.meta.id.substr(8)
        return DesignDocument._fromNsData(ddocName, ddocData.doc.json)
      })

      return ddocs
    }, callback)
  }

  async getDesignDocument(
    designDocName: string,
    options?: GetDesignDocumentOptions,
    callback?: NodeCallback<DesignDocument>
  ): Promise<DesignDocument> {
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
        type: HttpServiceType.Views,
        method: HttpMethod.Get,
        path: `/_design/${designDocName}`,
        timeout: timeout,
      })

      if (res.statusCode !== 200) {
        const errCtx = HttpExecutor.errorContextFromResponse(res)

        if (res.statusCode === 404) {
          throw new DesignDocumentNotFoundError(undefined, errCtx)
        }

        throw new CouchbaseError(
          'failed to get the design document',
          undefined,
          errCtx
        )
      }

      const ddocData = JSON.parse(res.body.toString())
      return DesignDocument._fromNsData(designDocName, ddocData)
    }, callback)
  }

  async upsertDesignDocument(
    designDoc: DesignDocument,
    options?: UpsertDesignDocumentOptions,
    callback?: NodeCallback<void>
  ): Promise<void> {
    if (options instanceof Function) {
      callback = arguments[2]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    const timeout = options.timeout
    return PromiseHelper.wrapAsync(async () => {
      const designDocData = {
        views: designDoc.views,
      }
      const encodedData = JSON.stringify(designDocData, (k, v) => {
        if (v instanceof Function) {
          return v.toString()
        }
        return v
      })

      const res = await this._http.request({
        type: HttpServiceType.Views,
        method: HttpMethod.Put,
        path: `/_design/${designDoc.name}`,
        contentType: 'application/json',
        body: encodedData,
        timeout: timeout,
      })

      if (res.statusCode !== 201) {
        const errCtx = HttpExecutor.errorContextFromResponse(res)

        throw new CouchbaseError(
          'failed to upsert the design document',
          undefined,
          errCtx
        )
      }
    }, callback)
  }

  async dropDesignDocument(
    designDocName: string,
    options?: DropDesignDocumentOptions,
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
        type: HttpServiceType.Views,
        method: HttpMethod.Delete,
        path: `/_design/${designDocName}`,
        timeout: timeout,
      })

      if (res.statusCode !== 200) {
        const errCtx = HttpExecutor.errorContextFromResponse(res)

        if (res.statusCode === 404) {
          throw new DesignDocumentNotFoundError(undefined, errCtx)
        }

        throw new CouchbaseError(
          'failed to drop the design document',
          undefined,
          errCtx
        )
      }
    }, callback)
  }

  async publishDesignDocument(
    designDocName: string,
    options?: PublishDesignDocumentOptions,
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
    const timer = new CompoundTimeout(timeout)

    return PromiseHelper.wrapAsync(async () => {
      const designDoc = await this.getDesignDocument(`dev_${designDocName}`, {
        timeout: timer.left(),
      })

      // Replace the name without the `dev_` prefix on it.
      designDoc.name = designDocName

      await this.upsertDesignDocument(designDoc, {
        timeout: timer.left(),
      })
    }, callback)
  }
}
