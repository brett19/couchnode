import { Cluster } from './cluster'
import { IndexNotFoundError } from './errors'
import { HttpExecutor, HttpMethod, HttpServiceType } from './httpexecutor'
import { NodeCallback, PromiseHelper } from './utilities'

export type SearchIndex = any

export interface GetSearchIndexOptions {
  timeout?: number
}

export interface GetAllSearchIndexesOptions {
  timeout?: number
}

export interface UpsertSearchIndexOptions {
  timeout?: number
}

export interface DropSearchIndexOptions {
  timeout?: number
}

export interface GetSearchIndexedDocumentsCountOptions {
  timeout?: number
}

export interface PauseSearchIngestOptions {
  timeout?: number
}

export interface ResumeSearchIngestOptions {
  timeout?: number
}

export interface AllowSearchQueryingOptions {
  timeout?: number
}

export interface DisallowSearchQueryingOptions {
  timeout?: number
}

export interface FreezeSearchPlanOptions {
  timeout?: number
}

export interface UnfreezeSearchPlanOptions {
  timeout?: number
}

export interface AnalyzeSearchDocumentOptions {
  timeout?: number
}

/**
 * SearchIndexManager provides an interface for managing the
 * search indexes on the cluster.
 *
 * @category Management
 */
export class SearchIndexManager {
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

  async getIndex(
    indexName: string,
    options?: GetSearchIndexOptions,
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
        type: HttpServiceType.Search,
        method: HttpMethod.Get,
        path: `/api/index/${indexName}`,
        timeout: timeout,
      })

      if (res.statusCode !== 200) {
        throw new IndexNotFoundError()
      }

      return JSON.parse(res.body.toString())
    }, callback)
  }

  async getAllIndexes(
    options?: GetAllSearchIndexesOptions,
    callback?: NodeCallback<SearchIndex[]>
  ): Promise<SearchIndex[]> {
    if (options instanceof Function) {
      callback = arguments[0]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    const timeout = options.timeout
    return PromiseHelper.wrapAsync(async () => {
      const res = await this._http.request({
        type: HttpServiceType.Search,
        method: HttpMethod.Get,
        path: `/api/index`,
        timeout: timeout,
      })

      if (res.statusCode !== 200) {
        throw new Error('failed to fetch search indices')
      }

      return JSON.parse(res.body.toString())
    }, callback)
  }

  async upsertIndex(
    indexDefinition: SearchIndex,
    options?: UpsertSearchIndexOptions,
    callback?: NodeCallback<void>
  ): Promise<void> {
    if (options instanceof Function) {
      callback = arguments[2]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    const indexName = indexDefinition.name
    const timeout = options.timeout
    return PromiseHelper.wrapAsync(async () => {
      const res = await this._http.request({
        type: HttpServiceType.Search,
        method: HttpMethod.Put,
        path: `/api/index/${indexName}`,
        contentType: 'application/json',
        body: JSON.stringify(indexDefinition),
        timeout: timeout,
      })

      if (res.statusCode !== 200) {
        throw new Error('failed to create index')
      }
    }, callback)
  }

  async dropIndex(
    indexName: string,
    options?: DropSearchIndexOptions,
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
        type: HttpServiceType.Search,
        method: HttpMethod.Delete,
        path: `/api/index/${indexName}`,
        timeout: timeout,
      })

      if (res.statusCode !== 200) {
        throw new Error('failed to delete search index')
      }

      return JSON.parse(res.body.toString())
    }, callback)
  }

  async getIndexedDocumentsCount(
    indexName: string,
    options?: GetSearchIndexedDocumentsCountOptions,
    callback?: NodeCallback<number>
  ): Promise<number> {
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
        type: HttpServiceType.Search,
        method: HttpMethod.Get,
        path: `/api/index/${indexName}/count`,
        timeout: timeout,
      })

      if (res.statusCode !== 200) {
        throw new Error('failed to get search indexed documents count')
      }

      return JSON.parse(res.body.toString())
    }, callback)
  }

  async pauseIngest(
    indexName: string,
    options?: PauseSearchIngestOptions,
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
        type: HttpServiceType.Search,
        method: HttpMethod.Post,
        path: `/api/index/${indexName}/ingestControl/pause`,
        timeout: timeout,
      })

      if (res.statusCode !== 200) {
        throw new Error('failed to pause search index ingestion')
      }
    }, callback)
  }

  async resumeIngest(
    indexName: string,
    options?: ResumeSearchIngestOptions,
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
        type: HttpServiceType.Search,
        method: HttpMethod.Post,
        path: `/api/index/${indexName}/ingestControl/resume`,
        timeout: timeout,
      })

      if (res.statusCode !== 200) {
        throw new Error('failed to resume search index ingestion')
      }
    }, callback)
  }

  async allowQuerying(
    indexName: string,
    options?: AllowSearchQueryingOptions,
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
        type: HttpServiceType.Search,
        method: HttpMethod.Post,
        path: `/api/index/${indexName}/queryControl/allow`,
        timeout: timeout,
      })

      if (res.statusCode !== 200) {
        throw new Error('failed to allow search index quering')
      }
    }, callback)
  }

  async disallowQuerying(
    indexName: string,
    options?: DisallowSearchQueryingOptions,
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
        type: HttpServiceType.Search,
        method: HttpMethod.Post,
        path: `/api/index/${indexName}/queryControl/disallow`,
        timeout: timeout,
      })

      if (res.statusCode !== 200) {
        throw new Error('failed to disallow search index quering')
      }
    }, callback)
  }

  async freezePlan(
    indexName: string,
    options?: FreezeSearchPlanOptions,
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
        type: HttpServiceType.Search,
        method: HttpMethod.Post,
        path: `/api/index/${indexName}/planFreezeControl/freeze`,
        timeout: timeout,
      })

      if (res.statusCode !== 200) {
        throw new Error('failed to freeze search index plan')
      }
    }, callback)
  }

  async analyzeDocument(
    indexName: string,
    document: any,
    options?: AnalyzeSearchDocumentOptions,
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
      const res = await this._http.request({
        type: HttpServiceType.Search,
        method: HttpMethod.Post,
        path: `/api/index/${indexName}/analyzeDoc`,
        timeout: timeout,
        body: JSON.stringify(document),
      })

      if (res.statusCode !== 200) {
        throw new Error('failed to perform search index document analysis')
      }

      return JSON.parse(res.body.toString()).analyze
    }, callback)
  }
}
