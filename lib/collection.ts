import { Connection } from './connection'
import { Scope } from './scope'
import { NodeCallback, PromiseHelper, Cas } from './utilities'
import { Transcoder } from './transcoders'
import {
  CounterResult,
  ExistsResult,
  GetReplicaResult,
  GetResult,
  LookupInResult,
  MutateInResult,
  MutationResult,
} from './crudoptypes'
import {
  IncrementOptions,
  DecrementOptions,
  AppendOptions,
  PrependOptions,
  BinaryCollection,
} from './binarycollection'
import binding, { CppReplicaMode, CppSdOpFlag } from './binding'
import { CppStoreOpType } from './binding'
import { duraLevelToCppDuraMode, translateCppError } from './bindingutilities'
import { StreamableReplicasPromise } from './streamablepromises'
import { LookupInMacro, LookupInSpec, MutateInSpec } from './sdspecs'
import { PathNotFoundError } from './errors'
import {
  CouchbaseList,
  CouchbaseMap,
  CouchbaseQueue,
  CouchbaseSet,
} from './datastructures'
import { SdUtils } from './sdutils'
import { DurabilityLevel } from './generaltypes'

/**
 * @category Key-Value
 */
export interface GetOptions {
  project?: string[]
  withExpiry?: boolean
  transcoder?: Transcoder
  timeout?: number
}

/**
 * @category Key-Value
 */
export interface InsertOptions {
  expiry?: number
  durabilityLevel?: DurabilityLevel
  durabilityPersistTo?: number
  durabilityReplicateTo?: number
  transcoder?: Transcoder
  timeout?: number
}

/**
 * @category Key-Value
 */
export interface UpsertOptions {
  expiry?: number
  durabilityLevel?: DurabilityLevel
  durabilityPersistTo?: number
  durabilityReplicateTo?: number
  transcoder?: Transcoder
  timeout?: number
}

/**
 * @category Key-Value
 */
export interface ReplaceOptions {
  expiry?: number
  cas?: Cas
  durabilityLevel?: DurabilityLevel
  durabilityPersistTo?: number
  durabilityReplicateTo?: number
  transcoder?: Transcoder
  timeout?: number
}

/**
 * @category Key-Value
 */
export interface RemoveOptions {
  cas?: Cas
  durabilityLevel?: DurabilityLevel
  durabilityPersistTo?: number
  durabilityReplicateTo?: number
  timeout?: number
}

/**
 * @category Key-Value
 */
export interface GetAnyReplicaOptions {
  transcoder?: Transcoder
  timeout?: number
}

/**
 * @category Key-Value
 */
export interface GetAllReplicasOptions {
  transcoder?: Transcoder
  timeout?: number
}

/**
 * @category Key-Value
 */
export interface TouchOptions {
  durabilityLevel?: DurabilityLevel
  durabilityPersistTo?: number
  durabilityReplicateTo?: number
  timeout?: number
}

/**
 * @category Key-Value
 */
export interface GetAndTouchOptions {
  transcoder?: Transcoder
  timeout?: number
}

/**
 * @category Key-Value
 */
export interface GetAndLockOptions {
  transcoder?: Transcoder
  timeout?: number
}

/**
 * @category Key-Value
 */
export interface UnlockOptions {
  timeout?: number
}

/**
 * @category Key-Value
 */
export interface LookupInOptions {
  timeout?: number
}

/**
 * @category Key-Value
 */
export interface MutateInOptions {
  expiry?: number
  cas?: Cas
  durabilityLevel?: DurabilityLevel
  durabilityPersistTo?: number
  durabilityReplicateTo?: number
  upsertDocument?: boolean
  timeout?: number
}

/**
 * @category Core
 */
export class Collection {
  /**
   * @internal
   */
  static DEFAULT_NAME = '_default'

  private _scope: Scope
  private _name: string
  private _conn: Connection

  /**
  @internal
  */
  constructor(scope: Scope, collectionName: string) {
    this._scope = scope
    this._name = collectionName
    this._conn = scope.conn
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
  get scope(): Scope {
    return this._scope
  }

  /**
  @internal
  */
  get transcoder(): Transcoder {
    return this._scope.transcoder
  }

  get name(): string {
    return this._name
  }

  private get _lcbScopeColl(): [string, string] {
    // BUG(JSCBC-853): There is a bug in libcouchbase which causes non-blank scope
    // and collection names to fail the collections feature-check when they should not.
    const scopeName = this.scope.name || '_default'
    const collectionName = this.name || '_default'
    if (scopeName === '_default' && collectionName === '_default') {
      return ['', '']
    }
    return [scopeName, collectionName]
  }

  get(
    key: string,
    options?: GetOptions,
    callback?: NodeCallback<GetResult>
  ): Promise<GetResult> {
    if (options instanceof Function) {
      callback = arguments[1]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    if (options.project || options.withExpiry) {
      return this._projectedGet(key, options, callback)
    }

    const transcoder = options.transcoder || this.transcoder
    const lcbTimeout = options.timeout ? options.timeout * 1000 : undefined

    return PromiseHelper.wrap((wrapCallback) => {
      this._conn.get(
        ...this._lcbScopeColl,
        key,
        transcoder,
        undefined,
        undefined,
        lcbTimeout,
        (err, cas, value) => {
          if (err) {
            return wrapCallback(err, null)
          }

          wrapCallback(
            null,
            new GetResult({
              content: value,
              cas: cas,
            })
          )
        }
      )
    }, callback)
  }

  private _projectedGet(
    key: string,
    options: GetOptions,
    callback?: NodeCallback<GetResult>
  ): Promise<GetResult> {
    let expiryStart = -1
    let projStart = -1
    let paths: string[] = []
    let spec: LookupInSpec[] = []
    let needReproject = false

    if (options.withExpiry) {
      expiryStart = spec.length
      spec.push(LookupInSpec.get(LookupInMacro.Expiry))
    }

    projStart = spec.length
    if (!options.project) {
      paths = ['']
      spec.push(LookupInSpec.get(''))
    } else {
      let projects = options.project
      if (!Array.isArray(projects)) {
        projects = [projects]
      }

      for (let i = 0; i < projects.length; ++i) {
        paths.push(projects[i])
        spec.push(LookupInSpec.get(projects[i]))
      }
    }

    // The following code relies on the projections being
    // the last segment of the specs array, this way we handle
    // an overburdened operation in a single area.
    if (spec.length > 16) {
      spec = spec.splice(0, projStart)
      spec.push(LookupInSpec.get(''))
      needReproject = true
    }

    return PromiseHelper.wrapAsync(async () => {
      const res = await this.lookupIn(key, spec, options)

      let content: any = null
      let expiry: number | undefined = undefined

      if (expiryStart >= 0) {
        const expiryRes = res.content[expiryStart]
        expiry = expiryRes.value
      }

      if (projStart >= 0) {
        if (!needReproject) {
          for (let i = 0; i < paths.length; ++i) {
            const projPath = paths[i]
            const projRes = res.content[projStart + i]
            if (!projRes.error) {
              content = SdUtils.insertByPath(content, projPath, projRes.value)
            }
          }
        } else {
          content = {}

          const reprojRes = res.content[projStart]
          for (let j = 0; j < paths.length; ++j) {
            const reprojPath = paths[j]
            const value = SdUtils.getByPath(reprojRes.value, reprojPath)
            content = SdUtils.insertByPath(content, reprojPath, value)
          }
        }
      }

      return new GetResult({
        content: content,
        cas: res.cas,
        expiry: expiry,
      })
    }, callback)
  }

  exists(
    key: string,
    options?: {
      timeout?: number
    },
    callback?: NodeCallback<ExistsResult>
  ): Promise<ExistsResult> {
    if (options instanceof Function) {
      callback = arguments[1]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    const lcbTimeout = options.timeout ? options.timeout * 1000 : undefined

    return PromiseHelper.wrap((wrapCallback) => {
      this._conn.exists(
        ...this._lcbScopeColl,
        key,
        lcbTimeout,
        (err, cas, exists) => {
          if (err) {
            return wrapCallback(err, null)
          }

          wrapCallback(
            null,
            new ExistsResult({
              cas,
              exists,
            })
          )
        }
      )
    }, callback)
  }

  getAnyReplica(
    key: string,
    options?: GetAnyReplicaOptions,
    callback?: NodeCallback<GetReplicaResult>
  ): Promise<GetReplicaResult> {
    return PromiseHelper.wrapAsync(async () => {
      const replicas = await this._getReplica(
        binding.LCB_REPLICA_MODE_ANY,
        key,
        options
      )
      return replicas[0]
    }, callback)
  }

  getAllReplicas(
    key: string,
    options?: GetAllReplicasOptions,
    callback?: NodeCallback<GetReplicaResult[]>
  ): Promise<GetReplicaResult[]> {
    return this._getReplica(
      binding.LCB_REPLICA_MODE_ALL,
      key,
      options,
      callback
    )
  }

  insert(
    key: string,
    value: any,
    options?: InsertOptions,
    callback?: NodeCallback<MutationResult>
  ): Promise<MutationResult> {
    return this._store(binding.LCB_STORE_INSERT, key, value, options, callback)
  }

  upsert(
    key: string,
    value: any,
    options?: UpsertOptions,
    callback?: NodeCallback<MutationResult>
  ): Promise<MutationResult> {
    return this._store(binding.LCB_STORE_UPSERT, key, value, options, callback)
  }

  replace(
    key: string,
    value: any,
    options?: ReplaceOptions,
    callback?: NodeCallback<MutationResult>
  ): Promise<MutationResult> {
    return this._store(binding.LCB_STORE_REPLACE, key, value, options, callback)
  }

  remove(
    key: string,
    options?: RemoveOptions,
    callback?: NodeCallback<MutationResult>
  ): Promise<MutationResult> {
    if (options instanceof Function) {
      callback = arguments[1]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    const cas = options.cas || null
    const cppDuraMode = duraLevelToCppDuraMode(options.durabilityLevel)
    const persistTo = options.durabilityPersistTo
    const replicateTo = options.durabilityReplicateTo
    const cppTimeout = options.timeout ? options.timeout * 1000 : undefined

    return PromiseHelper.wrap((wrapCallback) => {
      this._conn.remove(
        ...this._lcbScopeColl,
        key,
        cas,
        cppDuraMode,
        persistTo,
        replicateTo,
        cppTimeout,
        (err, cas) => {
          if (err) {
            return wrapCallback(err, null)
          }

          wrapCallback(
            err,
            new MutationResult({
              cas: cas,
            })
          )
        }
      )
    }, callback)
  }

  getAndTouch(
    key: string,
    expiry: number,
    options?: GetAndTouchOptions,
    callback?: NodeCallback<GetResult>
  ): Promise<GetResult> {
    if (options instanceof Function) {
      callback = arguments[2]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    const transcoder = options.transcoder || this.transcoder
    const lcbTimeout = options.timeout ? options.timeout * 1000 : undefined

    return PromiseHelper.wrap((wrapCallback) => {
      this._conn.get(
        ...this._lcbScopeColl,
        key,
        transcoder,
        expiry,
        undefined,
        lcbTimeout,
        (err, cas, value) => {
          if (err) {
            return wrapCallback(err, null)
          }

          wrapCallback(
            err,
            new GetResult({
              content: value,
              cas: cas,
            })
          )
        }
      )
    }, callback)
  }

  touch(
    key: string,
    expiry: number,
    options?: TouchOptions,
    callback?: NodeCallback<MutationResult>
  ): Promise<MutationResult> {
    if (options instanceof Function) {
      callback = arguments[1]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    const cppDuraMode = duraLevelToCppDuraMode(options.durabilityLevel)
    const persistTo = options.durabilityPersistTo
    const replicateTo = options.durabilityReplicateTo
    const cppTimeout = options.timeout ? options.timeout * 1000 : undefined

    return PromiseHelper.wrap((wrapCallback) => {
      this._conn.touch(
        ...this._lcbScopeColl,
        key,
        expiry,
        cppDuraMode,
        persistTo,
        replicateTo,
        cppTimeout,
        (err, cas) => {
          if (err) {
            return wrapCallback(err, null)
          }

          wrapCallback(
            err,
            new MutationResult({
              cas: cas,
            })
          )
        }
      )
    }, callback)
  }

  getAndLock(
    key: string,
    lockTime: number,
    options?: GetAndLockOptions,
    callback?: NodeCallback<GetResult>
  ): Promise<GetResult> {
    if (options instanceof Function) {
      callback = arguments[2]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    const transcoder = options.transcoder || this.transcoder
    const cppTimeout = options.timeout ? options.timeout * 1000 : undefined

    return PromiseHelper.wrap((wrapCallback) => {
      this._conn.get(
        ...this._lcbScopeColl,
        key,
        transcoder,
        undefined,
        lockTime,
        cppTimeout,
        (err, cas, value) => {
          if (err) {
            return wrapCallback(err, null)
          }

          wrapCallback(
            err,
            new GetResult({
              cas: cas,
              content: value,
            })
          )
        }
      )
    }, callback)
  }

  unlock(
    key: string,
    cas: Cas,
    options?: UnlockOptions,
    callback?: NodeCallback<MutationResult>
  ): Promise<MutationResult> {
    if (options instanceof Function) {
      callback = arguments[2]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    const cppTimeout = options.timeout ? options.timeout * 1000 : undefined

    return PromiseHelper.wrap((wrapCallback) => {
      this._conn.unlock(
        ...this._lcbScopeColl,
        key,
        cas,
        cppTimeout,
        (err, cas) => {
          if (err) {
            return wrapCallback(err, null)
          }

          wrapCallback(
            null,
            new MutationResult({
              cas: cas,
            })
          )
        }
      )
    }, callback)
  }

  lookupIn(
    key: string,
    specs: LookupInSpec[],
    options?: LookupInOptions,
    callback?: NodeCallback<LookupInResult>
  ): Promise<LookupInResult> {
    if (options instanceof Function) {
      callback = arguments[2]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    const flags: CppSdOpFlag = 0

    let cmdData: any = []
    for (let i = 0; i < specs.length; ++i) {
      cmdData = [...cmdData, specs[i]._op, specs[i]._flags, specs[i]._path]
    }

    const cppTimeout = options.timeout ? options.timeout * 1000 : undefined

    return PromiseHelper.wrap((wrapCallback) => {
      this._conn.lookupIn(
        ...this._lcbScopeColl,
        key,
        flags,
        cmdData,
        cppTimeout,
        (err, res) => {
          if (!res) {
            res = {}
          }

          if (res.content) {
            for (let i = 0; i < res.content.length; ++i) {
              const itemRes = res.content[i]
              itemRes.error = translateCppError(itemRes.error)
              if (itemRes.value && itemRes.value.length > 0) {
                itemRes.value = JSON.parse(itemRes.value)
              } else {
                itemRes.value = null
              }

              // TODO(brett19): BUG JSCBC-632 - This conversion logic should not be required,
              // it is expected that when JSCBC-632 is fixed, this code is removed as well.
              if (specs[i]._op === binding.LCBX_SDCMD_EXISTS) {
                if (!itemRes.error) {
                  itemRes.value = true
                } else if (itemRes.error instanceof PathNotFoundError) {
                  itemRes.error = null
                  itemRes.value = false
                }
              }
            }
          }

          wrapCallback(
            err,
            new LookupInResult({
              content: res.content,
              cas: res.cas,
            })
          )
        }
      )
    }, callback)
  }

  mutateIn(
    key: string,
    specs: MutateInSpec[],
    options?: MutateInOptions,
    callback?: NodeCallback<MutateInResult>
  ): Promise<MutateInResult> {
    if (options instanceof Function) {
      callback = arguments[2]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    let flags: CppSdOpFlag = 0
    if (options.upsertDocument) {
      flags |= binding.LCBX_SDFLAG_UPSERT_DOC
    }

    let cmdData: any = []
    for (let i = 0; i < specs.length; ++i) {
      cmdData = [
        ...cmdData,
        specs[i]._op,
        specs[i]._flags,
        specs[i]._path,
        specs[i]._data,
      ]
    }

    const expiry = options.expiry || 0
    const cas = options.cas
    const cppDuraMode = duraLevelToCppDuraMode(options.durabilityLevel)
    const persistTo = options.durabilityPersistTo
    const replicateTo = options.durabilityReplicateTo
    const cppTimeout = options.timeout ? options.timeout * 1000 : undefined

    return PromiseHelper.wrap((wrapCallback) => {
      this._conn.mutateIn(
        ...this._lcbScopeColl,
        key,
        expiry,
        cas,
        flags,
        cmdData,
        cppDuraMode,
        persistTo,
        replicateTo,
        cppTimeout,
        (err, res) => {
          if (res && res.content) {
            for (let i = 0; i < res.content.length; ++i) {
              const itemRes = res.content[i]
              if (itemRes.value && itemRes.value.length > 0) {
                res.content[i] = {
                  value: JSON.parse(itemRes.value),
                }
              } else {
                res.content[i] = null
              }
            }
          }

          wrapCallback(
            err,
            new MutateInResult({
              content: res.content,
              cas: res.cas,
            })
          )
        }
      )
    }, callback)
  }

  list(key: string): CouchbaseList {
    return new CouchbaseList(this, key)
  }

  queue(key: string): CouchbaseQueue {
    return new CouchbaseQueue(this, key)
  }

  map(key: string): CouchbaseMap {
    return new CouchbaseMap(this, key)
  }

  set(key: string): CouchbaseSet {
    return new CouchbaseSet(this, key)
  }

  binary(): BinaryCollection {
    return new BinaryCollection(this)
  }

  private _getReplica(
    mode: CppReplicaMode,
    key: string,
    options?: {
      transcoder?: Transcoder
      timeout?: number
    },
    callback?: NodeCallback<GetReplicaResult[]>
  ): StreamableReplicasPromise<GetReplicaResult[], GetReplicaResult> {
    if (options instanceof Function) {
      callback = arguments[1]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    const emitter = new StreamableReplicasPromise<
      GetReplicaResult[],
      GetReplicaResult
    >((replicas) => replicas)

    const transcoder = options.transcoder || this.transcoder
    const cppTimeout = options.timeout ? options.timeout * 1000 : undefined

    this._conn.getReplica(
      ...this._lcbScopeColl,
      key,
      transcoder,
      mode,
      cppTimeout,
      (err, rflags, cas, value) => {
        if (!err) {
          emitter.emit(
            'replica',
            new GetReplicaResult({
              content: value,
              cas: cas,
              isReplica: true,
            })
          )
        }

        if (!(rflags & binding.LCBX_RESP_F_NONFINAL)) {
          emitter.emit('end')
        }
      }
    )

    return PromiseHelper.wrapAsync(() => emitter, callback)
  }

  private _store(
    opType: CppStoreOpType,
    key: string,
    value: any,
    options?: {
      expiry?: number
      cas?: Cas
      durabilityLevel?: DurabilityLevel
      durabilityPersistTo?: number
      durabilityReplicateTo?: number
      transcoder?: Transcoder
      timeout?: number
    },
    callback?: NodeCallback<MutationResult>
  ): Promise<MutationResult> {
    if (options instanceof Function) {
      callback = arguments[3]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    const expiry = options.expiry
    const cas = options.cas
    const cppDuraMode = duraLevelToCppDuraMode(options.durabilityLevel)
    const persistTo = options.durabilityPersistTo
    const replicateTo = options.durabilityReplicateTo
    const transcoder = options.transcoder || this.transcoder
    const cppTimeout = options.timeout ? options.timeout * 1000 : undefined

    return PromiseHelper.wrap((wrapCallback) => {
      this._conn.store(
        ...this._lcbScopeColl,
        key,
        transcoder,
        value,
        expiry,
        cas,
        cppDuraMode,
        persistTo,
        replicateTo,
        cppTimeout,
        opType,
        (err, cas, token) => {
          if (err) {
            return wrapCallback(err, null)
          }

          wrapCallback(
            err,
            new MutationResult({
              cas: cas,
              token: token,
            })
          )
        }
      )
    }, callback)
  }

  private _counter(
    key: string,
    delta: number,
    options?: {
      initial?: number
      expiry?: number
      durabilityLevel?: DurabilityLevel
      durabilityPersistTo?: number
      durabilityReplicateTo?: number
      timeout?: number
    },
    callback?: NodeCallback<CounterResult>
  ): Promise<CounterResult> {
    if (options instanceof Function) {
      callback = arguments[2]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    const initial = options.initial
    const expiry = options.expiry
    const cppDuraMode = duraLevelToCppDuraMode(options.durabilityLevel)
    const persistTo = options.durabilityPersistTo
    const replicateTo = options.durabilityReplicateTo
    const cppTimeout = options.timeout ? options.timeout * 1000 : undefined

    return PromiseHelper.wrap((wrapCallback) => {
      this._conn.counter(
        ...this._lcbScopeColl,
        key,
        delta,
        initial,
        expiry,
        cppDuraMode,
        persistTo,
        replicateTo,
        cppTimeout,
        (err, cas, token, value) => {
          if (err) {
            return wrapCallback(err, null)
          }

          wrapCallback(
            err,
            new CounterResult({
              cas: cas,
              token: token,
              value: value,
            })
          )
        }
      )
    }, callback)
  }

  /**
   * @internal
   */
  _binaryIncrement(
    key: string,
    delta: number,
    options?: IncrementOptions,
    callback?: NodeCallback<CounterResult>
  ): Promise<CounterResult> {
    return this._counter(key, +delta, options, callback)
  }

  /**
   * @internal
   */
  _binaryDecrement(
    key: string,
    delta: number,
    options?: DecrementOptions,
    callback?: NodeCallback<CounterResult>
  ): Promise<CounterResult> {
    return this._counter(key, -delta, options, callback)
  }

  /**
   * @internal
   */
  _binaryAppend(
    key: string,
    value: string | Buffer,
    options?: AppendOptions,
    callback?: NodeCallback<MutationResult>
  ): Promise<MutationResult> {
    return this._store(binding.LCB_STORE_APPEND, key, value, options, callback)
  }

  /**
   * @internal
   */
  _binaryPrepend(
    key: string,
    value: string | Buffer,
    options?: PrependOptions,
    callback?: NodeCallback<MutationResult>
  ): Promise<MutationResult> {
    return this._store(binding.LCB_STORE_PREPEND, key, value, options, callback)
  }
}
