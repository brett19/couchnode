import { Cluster } from './cluster'
import {
  CouchbaseError,
  DatasetExistsError,
  DatasetNotFoundError,
  DataverseExistsError,
  DataverseNotFoundError,
} from './errors'
import { HttpExecutor, HttpMethod, HttpServiceType } from './httpexecutor'
import { NodeCallback, PromiseHelper } from './utilities'

export class AnalyticsDataset {
  name: string
  dataverseName: string
  linkName: string
  bucketName: string

  /**
   * @internal
   */
  constructor(data: AnalyticsDataset) {
    this.name = data.name
    this.dataverseName = data.dataverseName
    this.linkName = data.linkName
    this.bucketName = data.bucketName
  }
}

export class AnalyticsIndex {
  name: string
  datasetName: string
  dataverseName: string
  isPrimary: boolean

  /**
   * @internal
   */
  constructor(data: AnalyticsIndex) {
    this.name = data.name
    this.datasetName = data.datasetName
    this.dataverseName = data.dataverseName
    this.isPrimary = data.isPrimary
  }
}

export interface CreateAnalyticsDataverseOptions {
  ignoreIfExists?: boolean
  timeout?: number
}

export interface DropAnalyticsDataverseOptions {
  ignoreIfNotExists?: boolean
  timeout?: number
}

export interface CreateAnalyticsDatasetOptions {
  ignoreIfExists?: boolean
  dataverseName?: string
  condition?: string
  timeout?: number
}

export interface DropAnalyticsDatasetOptions {
  ignoreIfNotExists?: boolean
  dataverseName?: string
  timeout?: number
}

export interface GetAllAnalyticsDatasetsOptions {
  timeout?: number
}

export interface CreateAnalyticsIndexOptions {
  ignoreIfExists?: boolean
  dataverseName?: string
  timeout?: number
}

export interface DropAnalyticsIndexOptions {
  ignoreIfNotExists?: boolean
  dataverseName?: string
  timeout?: number
}

export interface GetAllAnalyticsIndexesOptions {
  timeout?: number
}

export interface ConnectAnalyticsLinkOptions {
  timeout?: number
}

export interface DisconnectAnalyticsLinkOptions {
  timeout?: number
}

export interface GetPendingAnalyticsMutationsOptions {
  timeout?: number
}

/**
 * AnalyticsIndexManager provides an interface for performing management
 * operations against the analytics indexes for the cluster.
 *
 * @category Management
 */
export class AnalyticsIndexManager {
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

  async createDataverse(
    dataverseName: string,
    options?: CreateAnalyticsDataverseOptions,
    callback?: NodeCallback<void>
  ): Promise<void> {
    if (options instanceof Function) {
      callback = arguments[1]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    let qs = ''

    qs += 'CREATE DATAVERSE'

    qs += ' `' + dataverseName + '`'

    if (options.ignoreIfExists) {
      qs += ' IF NOT EXISTS'
    }

    const timeout = options.timeout

    return PromiseHelper.wrapAsync(async () => {
      try {
        await this._cluster.analyticsQuery(qs, {
          timeout: timeout,
        })
      } catch (err) {
        if (err instanceof DataverseExistsError) {
          throw err
        }

        throw new CouchbaseError('failed to create dataverse', err)
      }
    }, callback)
  }

  async dropDataverse(
    dataverseName: string,
    options?: DropAnalyticsDataverseOptions,
    callback?: NodeCallback<void>
  ): Promise<void> {
    if (options instanceof Function) {
      callback = arguments[1]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    let qs = ''

    qs += 'DROP DATAVERSE'

    qs += ' `' + dataverseName + '`'

    if (options.ignoreIfNotExists) {
      qs += ' IF EXISTS'
    }

    const timeout = options.timeout

    return PromiseHelper.wrapAsync(async () => {
      try {
        await this._cluster.analyticsQuery(qs, {
          timeout: timeout,
        })
      } catch (err) {
        if (err instanceof DataverseNotFoundError) {
          throw err
        }

        throw new CouchbaseError('failed to drop dataverse', err)
      }
    }, callback)
  }

  async createDataset(
    bucketName: string,
    datasetName: string,
    options?: CreateAnalyticsDatasetOptions,
    callback?: NodeCallback<void>
  ): Promise<void> {
    if (options instanceof Function) {
      callback = arguments[2]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    let qs = ''

    qs += 'CREATE DATASET'

    if (options.ignoreIfExists) {
      qs += ' IF NOT EXISTS'
    }

    if (options.dataverseName) {
      qs += ' `' + options.dataverseName + '`.`' + datasetName + '`'
    } else {
      qs += ' `' + datasetName + '`'
    }

    qs += ' ON `' + bucketName + '`'

    if (options.condition) {
      qs += ' WHERE ' + options.condition
    }

    const timeout = options.timeout

    return PromiseHelper.wrapAsync(async () => {
      try {
        await this._cluster.analyticsQuery(qs, {
          timeout: timeout,
        })
      } catch (err) {
        if (err instanceof DatasetExistsError) {
          throw err
        }

        throw new CouchbaseError('failed to create dataset', err)
      }
    }, callback)
  }

  async dropDataset(
    datasetName: string,
    options?: DropAnalyticsDatasetOptions,
    callback?: NodeCallback<void>
  ): Promise<void> {
    if (options instanceof Function) {
      callback = arguments[1]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    let qs = ''

    qs += 'DROP DATASET'

    if (options.dataverseName) {
      qs += ' `' + options.dataverseName + '`.`' + datasetName + '`'
    } else {
      qs += ' `' + datasetName + '`'
    }

    if (options.ignoreIfNotExists) {
      qs += ' IF EXISTS'
    }

    const timeout = options.timeout

    return PromiseHelper.wrapAsync(async () => {
      try {
        await this._cluster.analyticsQuery(qs, {
          timeout: timeout,
        })
      } catch (err) {
        if (err instanceof DatasetNotFoundError) {
          throw err
        }

        throw new CouchbaseError('failed to drop dataset', err)
      }
    }, callback)
  }

  async getAllDatasets(
    options?: GetAllAnalyticsDatasetsOptions,
    callback?: NodeCallback<AnalyticsDataset[]>
  ): Promise<AnalyticsDataset[]> {
    if (options instanceof Function) {
      callback = arguments[0]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    const qs =
      'SELECT d.* FROM `Metadata`.`Dataset` d WHERE d.DataverseName <> "Metadata"'

    const timeout = options.timeout

    return PromiseHelper.wrapAsync(async () => {
      const res = await this._cluster.analyticsQuery(qs, {
        timeout: timeout,
      })

      const datasets = res.rows.map(
        (row) =>
          new AnalyticsDataset({
            name: row.DatasetName,
            dataverseName: row.DataverseName,
            linkName: row.LinkName,
            bucketName: row.BucketName,
          })
      )

      return datasets
    }, callback)
  }

  async createIndex(
    datasetName: string,
    indexName: string,
    fields: { [key: string]: string },
    options?: CreateAnalyticsIndexOptions,
    callback?: NodeCallback<void>
  ): Promise<void> {
    if (options instanceof Function) {
      callback = arguments[3]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    let qs = ''

    qs += 'CREATE INDEX'

    qs += ' `' + indexName + '`'

    if (options.ignoreIfExists) {
      qs += ' IF NOT EXISTS'
    }

    if (options.dataverseName) {
      qs += ' ON `' + options.dataverseName + '`.`' + datasetName + '`'
    } else {
      qs += ' ON `' + datasetName + '`'
    }

    qs += ' ('

    qs += Object.keys(fields)
      .map((i) => '`' + i + '`: ' + fields[i])
      .join(', ')

    qs += ')'

    const timeout = options.timeout

    return PromiseHelper.wrapAsync(async () => {
      await this._cluster.analyticsQuery(qs, {
        timeout: timeout,
      })
    }, callback)
  }

  async dropIndex(
    datasetName: string,
    indexName: string,
    options?: DropAnalyticsIndexOptions,
    callback?: NodeCallback<void>
  ): Promise<void> {
    if (options instanceof Function) {
      callback = arguments[2]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    let qs = ''

    qs += 'DROP INDEX'

    if (options.dataverseName) {
      qs += ' `' + options.dataverseName + '`.`' + datasetName + '`'
    } else {
      qs += ' `' + datasetName + '`'
    }
    qs += '.`' + indexName + '`'

    if (options.ignoreIfNotExists) {
      qs += ' IF EXISTS'
    }

    const timeout = options.timeout

    return PromiseHelper.wrapAsync(async () => {
      await this._cluster.analyticsQuery(qs, {
        timeout: timeout,
      })
    }, callback)
  }

  async getAllIndexes(
    options?: GetAllAnalyticsIndexesOptions,
    callback?: NodeCallback<AnalyticsIndex[]>
  ): Promise<AnalyticsIndex[]> {
    if (options instanceof Function) {
      callback = arguments[0]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    const qs =
      'SELECT d.* FROM `Metadata`.`Index` d WHERE d.DataverseName <> "Metadata"'

    const timeout = options.timeout

    return PromiseHelper.wrapAsync(async () => {
      const res = await this._cluster.analyticsQuery(qs, {
        timeout: timeout,
      })

      const indexes = res.rows.map(
        (row) =>
          new AnalyticsIndex({
            name: row.IndexName,
            datasetName: row.DatasetName,
            dataverseName: row.DataverseName,
            isPrimary: row.IsPrimary,
          })
      )

      return indexes
    }, callback)
  }

  async connectLink(
    linkName: string,
    options?: ConnectAnalyticsLinkOptions,
    callback?: NodeCallback<void>
  ): Promise<void> {
    if (options instanceof Function) {
      callback = arguments[1]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    const qs = 'CONNECT LINK ' + linkName

    const timeout = options.timeout

    return PromiseHelper.wrapAsync(async () => {
      await this._cluster.analyticsQuery(qs, {
        timeout: timeout,
      })
    }, callback)
  }

  async disconnectLink(
    linkName: string,
    options?: DisconnectAnalyticsLinkOptions,
    callback?: NodeCallback<void>
  ): Promise<void> {
    if (options instanceof Function) {
      callback = arguments[1]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    const qs = 'DISCONNECT LINK ' + linkName

    const timeout = options.timeout

    return PromiseHelper.wrapAsync(async () => {
      await this._cluster.analyticsQuery(qs, {
        timeout: timeout,
      })
    }, callback)
  }

  async getPendingMutations(
    options?: GetPendingAnalyticsMutationsOptions,
    callback?: NodeCallback<{ [k: string]: { [k: string]: number } }>
  ): Promise<{ [k: string]: { [k: string]: number } }> {
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
        type: HttpServiceType.Analytics,
        method: HttpMethod.Get,
        path: `/analytics/node/agg/stats/remaining`,
        timeout: timeout,
      })

      if (res.statusCode !== 200) {
        const errCtx = HttpExecutor.errorContextFromResponse(res)

        throw new CouchbaseError(
          'failed to get pending mutations',
          undefined,
          errCtx
        )
      }

      return JSON.parse(res.body.toString())
    }, callback)
  }
}
