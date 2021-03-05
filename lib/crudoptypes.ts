import { MutationToken } from './mutationstate'
import { Cas } from './utilities'

export class GetResult {
  content: any
  cas: Cas
  expiry?: number

  /**
   * @internal
   */
  constructor(data: { content: any; cas: Cas; expiry?: number }) {
    this.content = data.content
    this.cas = data.cas
    this.expiry = data.expiry
  }

  /**
   * @deprecated BUG(JSCBC-784): Use {@link GetResult.content} instead.
   */
  get value(): any {
    return this.content
  }
  set value(v: any) {
    this.content = v
  }
}

export class ExistsResult {
  exists: boolean
  cas: Cas

  /**
   * @internal
   */
  constructor(data: ExistsResult) {
    this.exists = data.exists
    this.cas = data.cas
  }
}

export class MutationResult {
  cas: Cas
  token?: MutationToken

  /**
   * @internal
   */
  constructor(data: MutationResult) {
    this.cas = data.cas
    this.token = data.token
  }
}

export class GetReplicaResult {
  content: any
  cas: Cas
  isReplica: boolean

  /**
   * @internal
   */
  constructor(data: { content: any; cas: Cas; isReplica: boolean }) {
    this.content = data.content
    this.cas = data.cas
    this.isReplica = data.isReplica
  }

  /**
   * @deprecated BUG(JSCBC-784): Use {@link GetReplicaResult.content} instead.
   */
  get value(): any {
    return this.content
  }
  set value(v: any) {
    this.content = v
  }
}

export class LookupInResultEntry {
  error: Error | null
  value?: any

  /**
   * @internal
   */
  constructor(data: LookupInResultEntry) {
    this.error = data.error
    this.value = data.value
  }
}

export class LookupInResult {
  content: LookupInResultEntry[]
  cas: Cas

  /**
   * @internal
   */
  constructor(data: { content: LookupInResultEntry[]; cas: Cas }) {
    this.content = data.content
    this.cas = data.cas
  }

  /**
   * @deprecated BUG(JSCBC-730): Use {@link LookupInResult.content} instead.
   */
  get results(): LookupInResultEntry[] {
    return this.content
  }
  set results(v: LookupInResultEntry[]) {
    this.content = v
  }
}

export class MutateInResultEntry {
  value: any | undefined

  /**
   * @internal
   */
  constructor(data: MutateInResultEntry) {
    this.value = data.value
  }
}

export class MutateInResult {
  content: MutateInResultEntry[]
  cas: Cas

  /**
   * @internal
   */
  constructor(data: MutateInResult) {
    this.content = data.content
    this.cas = data.cas
  }
}

export class CounterResult {
  value: number
  cas: Cas
  token?: MutationToken

  /**
   * @internal
   */
  constructor(data: CounterResult) {
    this.value = data.value
    this.cas = data.cas
    this.token = data.token
  }
}
