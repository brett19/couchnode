import { Collection } from './collection'
import { CouchbaseError, PathExistsError, PathInvalidError } from './errors'
import { LookupInSpec, MutateInSpec } from './sdspecs'
import { NodeCallback, PromiseHelper } from './utilities'

/**
 * CouchbaseList provides a simplified interface
 * for storing lists within a Couchbase document.
 *
 * @see Collection::list
 * @category Datastructures
 */
export class CouchbaseList {
  private _coll: Collection
  private _key: string

  /**
   * @internal
   */
  constructor(collection: Collection, key: string) {
    this._coll = collection
    this._key = key
  }

  private async _get(): Promise<any[]> {
    const doc = await this._coll.get(this._key)
    if (!(doc.content instanceof Array)) {
      throw new CouchbaseError('expected document of array type')
    }

    return doc.content
  }

  /**
   *
   * @param {function} callback
   */
  async getAll(callback?: NodeCallback<any[]>): Promise<any[]> {
    return PromiseHelper.wrapAsync(async () => {
      return await this._get()
    }, callback)
  }

  async forEach(
    rowCallback: (value: any, index: number, array: CouchbaseList) => void,
    callback?: NodeCallback<void>
  ): Promise<void> {
    return PromiseHelper.wrapAsync(async () => {
      const values = await this._get()
      for (let i = 0; i < values.length; ++i) {
        rowCallback(values[i], i, this)
      }
    }, callback)
  }

  [Symbol.asyncIterator](): AsyncIterator<any> {
    const getNext = async () => this._get()
    return {
      data: null as null | any[],
      index: -1,
      async next() {
        if (this.index < 0) {
          this.data = await getNext()
          this.index = 0
        }

        const data = this.data as any[]
        if (this.index < data.length) {
          return { done: false, value: data[this.index++] }
        }

        return { done: true }
      },
    } as any
  }

  /**
   *
   * @param {*} index
   * @param {function} callback
   */
  async getAt(index: number, callback?: NodeCallback<any>): Promise<any> {
    return PromiseHelper.wrapAsync(async () => {
      const res = await this._coll.lookupIn(this._key, [
        LookupInSpec.get('[' + index + ']'),
      ])

      const itemRes = res.content[0]
      if (itemRes.error) {
        throw itemRes.error
      }

      return itemRes.value
    }, callback)
  }

  /**
   *
   * @param {*} index
   * @param {function} callback
   */
  async removeAt(index: number, callback?: NodeCallback<void>): Promise<void> {
    return PromiseHelper.wrapAsync(async () => {
      await this._coll.mutateIn(this._key, [
        MutateInSpec.remove('[' + index + ']'),
      ])
    }, callback)
  }

  /**
   *
   * @param {*} value
   * @param {function} callback
   */
  async indexOf(value: any, callback?: NodeCallback<number>): Promise<number> {
    return PromiseHelper.wrapAsync(async () => {
      const items = await this._get()

      for (let i = 0; i < items.length; ++i) {
        if (items[i] === value) {
          return i
        }
      }

      return -1
    }, callback)
  }

  /**
   *
   * @param {function} callback
   */
  async size(callback?: NodeCallback<number>): Promise<number> {
    return PromiseHelper.wrapAsync(async () => {
      const res = await this._coll.lookupIn(this._key, [LookupInSpec.count('')])
      return res.content[0].value
    }, callback)
  }

  /**
   *
   * @param {*} value
   * @param {function} callback
   */
  async push(value: any, callback?: NodeCallback<void>): Promise<void> {
    return PromiseHelper.wrapAsync(async () => {
      await this._coll.mutateIn(
        this._key,
        [MutateInSpec.arrayAppend('', value)],
        {
          upsertDocument: true,
        }
      )
    }, callback)
  }

  /**
   *
   * @param {*} value
   * @param {function} callback
   */
  async unshift(value: any, callback?: NodeCallback<void>): Promise<void> {
    return PromiseHelper.wrapAsync(async () => {
      await this._coll.mutateIn(
        this._key,
        [MutateInSpec.arrayPrepend('', value)],
        {
          upsertDocument: true,
        }
      )
    }, callback)
  }
}

/**
 * CouchbaseMap provides a simplified interface
 * for storing a map within a Couchbase document.
 *
 * @category Datastructures
 */
export class CouchbaseMap {
  private _coll: Collection
  private _key: string

  /**
   * @internal
   */
  constructor(collection: Collection, key: string) {
    this._coll = collection
    this._key = key
  }

  private async _get(): Promise<{ [key: string]: any }> {
    const doc = await this._coll.get(this._key)
    if (!(doc.content instanceof Object)) {
      throw new CouchbaseError('expected document of object type')
    }

    return doc.content
  }

  /**
   *
   * @param {function} callback
   */
  async getAll(
    callback?: NodeCallback<{ [key: string]: any }>
  ): Promise<{ [key: string]: any }> {
    return PromiseHelper.wrapAsync(async () => {
      return await this._get()
    }, callback)
  }

  /**
   *
   * @param {function} rowCallback
   * @param {function} callback
   */
  async forEach(
    rowCallback: (value: any, key: string, map: CouchbaseMap) => void,
    callback?: NodeCallback<void>
  ): Promise<void> {
    return PromiseHelper.wrapAsync(async () => {
      const values = await this._get()
      for (const i in values) {
        rowCallback(values[i], i, this)
      }
    }, callback)
  }

  [Symbol.asyncIterator](): AsyncIterator<[any, string]> {
    const getNext = async () => this._get()
    return {
      data: null as { [key: string]: any } | null,
      keys: null as string[] | null,
      index: -1,
      async next() {
        if (this.index < 0) {
          this.data = await getNext()
          this.keys = Object.keys(this.data)
          this.index = 0
        }

        const keys = this.keys as string[]
        const data = this.data as { [key: string]: any }
        if (this.index < keys.length) {
          const key = keys[this.index++]
          return { done: false, value: [data[key], key] }
        }

        return { done: true, value: undefined }
      },
    } as any
  }

  /**
   *
   * @param {*} item
   * @param {*} value
   * @param {function} callback
   */
  async set(
    item: string,
    value: any,
    callback?: NodeCallback<void>
  ): Promise<void> {
    return PromiseHelper.wrapAsync(async () => {
      await this._coll.mutateIn(this._key, [MutateInSpec.upsert(item, value)], {
        upsertDocument: true,
      })
    }, callback)
  }

  /**
   *
   * @param {*} item
   * @param {function} callback
   */
  async get(item: string, callback?: NodeCallback<any>): Promise<any> {
    return PromiseHelper.wrapAsync(async () => {
      const res = await this._coll.lookupIn(this._key, [LookupInSpec.get(item)])

      const itemRes = res.content[0]
      if (itemRes.error) {
        throw itemRes.error
      }

      return itemRes.value
    }, callback)
  }

  /**
   *
   * @param {*} item
   * @param {function} callback
   */
  async remove(item: string, callback?: NodeCallback<void>): Promise<void> {
    return PromiseHelper.wrapAsync(async () => {
      await this._coll.mutateIn(this._key, [MutateInSpec.remove(item)])
    }, callback)
  }

  /**
   *
   * @param {*} item
   * @param {function} callback
   */
  async exists(
    item: string,
    callback?: NodeCallback<boolean>
  ): Promise<boolean> {
    return PromiseHelper.wrapAsync(async () => {
      const res = await this._coll.lookupIn(this._key, [
        LookupInSpec.exists(item),
      ])

      const itemRes = res.content[0]
      return itemRes.value
    }, callback)
  }

  /**
   *
   * @param {function} callback
   */
  async keys(callback?: NodeCallback<string[]>): Promise<string[]> {
    return PromiseHelper.wrapAsync(async () => {
      const values = await this._get()
      return Object.keys(values)
    }, callback)
  }

  /**
   *
   * @param {function} callback
   */
  async values(callback?: NodeCallback<any[]>): Promise<any[]> {
    return PromiseHelper.wrapAsync(async () => {
      const values = await this._get()
      return Object.values(values)
    }, callback)
  }

  /**
   *
   * @param {function} callback
   */
  async size(callback?: NodeCallback<number>): Promise<number> {
    return PromiseHelper.wrapAsync(async () => {
      const res = await this._coll.lookupIn(this._key, [LookupInSpec.count('')])
      return res.content[0].value
    }, callback)
  }
}

/**
 * CouchbaseQueue provides a simplified interface
 * for storing a queue within a Couchbase document.
 *
 * @category Datastructures
 */
export class CouchbaseQueue {
  private _coll: Collection
  private _key: string

  /**
   * @internal
   */
  constructor(collection: Collection, key: string) {
    this._coll = collection
    this._key = key
  }

  private async _get(): Promise<any[]> {
    const doc = await this._coll.get(this._key)
    if (!(doc.content instanceof Array)) {
      throw new CouchbaseError('expected document of array type')
    }

    return doc.content
  }

  /**
   *
   * @param {function} callback
   */
  async size(callback?: NodeCallback<number>): Promise<number> {
    return PromiseHelper.wrapAsync(async () => {
      const res = await this._coll.lookupIn(this._key, [LookupInSpec.count('')])
      return res.content[0].value
    }, callback)
  }

  /**
   *
   * @param {*} value
   * @param {function} callback
   */
  async push(value: any, callback?: NodeCallback<void>): Promise<void> {
    return PromiseHelper.wrapAsync(async () => {
      await this._coll.mutateIn(
        this._key,
        [MutateInSpec.arrayPrepend('', value)],
        {
          upsertDocument: true,
        }
      )
    }, callback)
  }

  /**
   *
   * @param {function} callback
   */
  async pop(callback?: NodeCallback<any>): Promise<any> {
    return PromiseHelper.wrapAsync(async () => {
      for (let i = 0; i < 16; ++i) {
        try {
          const res = await this._coll.lookupIn(this._key, [
            LookupInSpec.get('[-1]'),
          ])

          const value = res.results[0].value

          await this._coll.mutateIn(this._key, [MutateInSpec.remove('[-1]')], {
            cas: res.cas,
          })

          return value
        } catch (e) {
          if (e instanceof PathInvalidError) {
            throw new CouchbaseError('no items available in list')
          }

          // continue and retry
        }
      }

      throw new CouchbaseError('no items available to pop')
    }, callback)
  }
}

/**
 * CouchbaseSet provides a simplified interface
 * for storing a set within a Couchbase document.
 *
 * @category Datastructures
 */
export class CouchbaseSet {
  private _coll: Collection
  private _key: string

  /**
   * @internal
   */
  constructor(collection: Collection, key: string) {
    this._coll = collection
    this._key = key
  }

  private async _get(): Promise<any[]> {
    const doc = await this._coll.get(this._key)
    if (!(doc.content instanceof Array)) {
      throw new CouchbaseError('expected document of array type')
    }

    return doc.content
  }

  /**
   *
   * @param {*} item
   * @param {function} callback
   */
  async add(item: any, callback?: NodeCallback<boolean>): Promise<boolean> {
    return PromiseHelper.wrapAsync(async () => {
      try {
        await this._coll.mutateIn(
          this._key,
          [MutateInSpec.arrayAddUnique('', item)],
          {
            upsertDocument: true,
          }
        )
      } catch (e) {
        if (e instanceof PathExistsError) {
          return false
        }

        throw e
      }

      return true
    }, callback)
  }

  /**
   *
   * @param {*} item
   * @param {function} callback
   */
  async contains(
    item: any,
    callback?: NodeCallback<boolean>
  ): Promise<boolean> {
    return PromiseHelper.wrapAsync(async () => {
      const values = await this._get()
      for (let i = 0; i < values.length; ++i) {
        if (values[i] === item) {
          return true
        }
      }
      return false
    }, callback)
  }

  /**
   *
   * @param {*} item
   * @param {function} callback
   */
  async remove(item: any, callback?: NodeCallback<void>): Promise<void> {
    return PromiseHelper.wrapAsync(async () => {
      for (let i = 0; i < 16; ++i) {
        try {
          const res = await this._get()

          const itemIdx = res.indexOf(item)
          if (itemIdx === -1) {
            throw new Error('item was not found in set')
          }

          await this._coll.mutateIn(
            this._key,
            [MutateInSpec.remove('[' + itemIdx + ']')],
            {
              cas: (res as any).cas,
            }
          )

          return
        } catch (e) {
          // continue and retry
        }
      }

      throw new CouchbaseError('no items available to pop')
    }, callback)
  }

  /**
   *
   * @param {function} callback
   */
  async values(callback?: NodeCallback<any[]>): Promise<any[]> {
    return PromiseHelper.wrapAsync(async () => {
      return await this._get()
    }, callback)
  }

  /**
   *
   * @param {function} callback
   */
  async size(callback?: NodeCallback<number>): Promise<number> {
    return PromiseHelper.wrapAsync(async () => {
      const res = await this._coll.lookupIn(this._key, [LookupInSpec.count('')])
      return res.content[0].value
    }, callback)
  }
}
