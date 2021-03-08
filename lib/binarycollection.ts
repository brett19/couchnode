import { Collection } from './collection'
import { CounterResult, MutationResult } from './crudoptypes'
import { NodeCallback } from './utilities'

export interface IncrementOptions {
  initial?: number
  expiry?: number
  timeout?: number
}

export interface DecrementOptions {
  initial?: number
  expiry?: number
  timeout?: number
}

export interface AppendOptions {
  timeout?: number
}

export interface PrependOptions {
  timeout?: number
}

export class BinaryCollection {
  private _coll: Collection

  /**
   * @internal
   */
  constructor(parent: Collection) {
    this._coll = parent
  }

  increment(
    key: string,
    delta: number,
    options?: IncrementOptions,
    callback?: NodeCallback<CounterResult>
  ): Promise<CounterResult> {
    return this._coll._binaryIncrement(key, delta, options, callback)
  }

  decrement(
    key: string,
    delta: number,
    options?: DecrementOptions,
    callback?: NodeCallback<CounterResult>
  ): Promise<CounterResult> {
    return this._coll._binaryDecrement(key, delta, options, callback)
  }

  append(
    key: string,
    value: string | Buffer,
    options?: AppendOptions,
    callback?: NodeCallback<MutationResult>
  ): Promise<MutationResult> {
    return this._coll._binaryAppend(key, value, options, callback)
  }

  prepend(
    key: string,
    value: string | Buffer,
    options?: PrependOptions,
    callback?: NodeCallback<MutationResult>
  ): Promise<MutationResult> {
    return this._coll._binaryPrepend(key, value, options, callback)
  }
}
