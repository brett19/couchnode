import binding, { CppSdCmdType, CppSdSpecFlag } from './binding'

/**
 * @category Sub-Document
 */
export class LookupInMacro {
  /**
   * @internal
   */
  _value: string

  constructor(value: string) {
    this._value = value
  }

  static get Document(): LookupInMacro {
    return new LookupInMacro('$document')
  }

  static get Expiry(): LookupInMacro {
    return new LookupInMacro('$document.expiry')
  }

  static get Cas(): LookupInMacro {
    return new LookupInMacro('$document.CAS')
  }

  static get SeqNo(): LookupInMacro {
    return new LookupInMacro('$document.seqno')
  }

  static get LastModified(): LookupInMacro {
    return new LookupInMacro('$document.last_modified')
  }

  static get IsDeleted(): LookupInMacro {
    return new LookupInMacro('$document.deleted')
  }

  static get ValueSizeBytes(): LookupInMacro {
    return new LookupInMacro('$document.value_bytes')
  }

  static get RevId(): LookupInMacro {
    return new LookupInMacro('$document.revid')
  }
}

/**
 * @category Sub-Document
 */
export class MutateInMacro {
  /**
   * @internal
   */
  _value: string

  constructor(value: string) {
    this._value = value
  }

  static get Cas(): MutateInMacro {
    return new MutateInMacro('${document.CAS}')
  }

  static get SeqNo(): MutateInMacro {
    return new MutateInMacro('${document.seqno}')
  }

  static get ValueCrc32c(): MutateInMacro {
    return new MutateInMacro('${document.value_crc32c}')
  }
}

/**
 * @category Sub-Document
 */
export class LookupInSpec {
  /**
   * @deprecated BUG(JSCBC-756): Use {@link LookupInMacro.Expiry} instead.
   */
  static get Expiry(): LookupInMacro {
    return LookupInMacro.Expiry
  }

  /**
   * @internal
   */
  _op: CppSdCmdType

  /**
   * @internal
   */
  _path: string

  /**
   * @internal
   */
  _flags: CppSdSpecFlag

  private constructor(op: CppSdCmdType, path: string, flags: CppSdSpecFlag) {
    this._op = op
    this._path = path
    this._flags = flags
  }

  private static _create(
    op: CppSdCmdType,
    path: string | LookupInMacro,
    options?: { xattr?: boolean }
  ) {
    if (!options) {
      options = {}
    }

    let flags: CppSdSpecFlag = 0

    if (path instanceof LookupInMacro) {
      path = path._value
      flags |= binding.LCB_SUBDOCSPECS_F_XATTRPATH
    }

    if (options.xattr) {
      flags |= binding.LCB_SUBDOCSPECS_F_XATTRPATH
    }

    return new LookupInSpec(op, path, flags)
  }

  static get(
    path: string | LookupInMacro,
    options?: { xattr?: boolean }
  ): LookupInSpec {
    return this._create(binding.LCBX_SDCMD_GET, path, options)
  }

  static exists(
    path: string | LookupInMacro,
    options?: { xattr?: boolean }
  ): LookupInSpec {
    return this._create(binding.LCBX_SDCMD_EXISTS, path, options)
  }

  static count(
    path: string | LookupInMacro,
    options?: { xattr?: boolean }
  ): LookupInSpec {
    return this._create(binding.LCBX_SDCMD_GET_COUNT, path, options)
  }
}

/**
 * @category Sub-Document
 */
export class MutateInSpec {
  /**
   * @deprecated BUG(JSCBC-756): Use {@link MutateInMacro.Cas} instead.
   */
  static get CasPlaceholder(): MutateInMacro {
    return MutateInMacro.Cas
  }

  /**
   * @internal
   */
  _op: CppSdCmdType

  /**
   * @internal
   */
  _path: string

  /**
   * @internal
   */
  _flags: CppSdSpecFlag

  /**
   * @internal
   */
  _data: any

  private constructor(
    op: CppSdCmdType,
    path: string,
    flags: CppSdSpecFlag,
    data: any
  ) {
    this._op = op
    this._path = path
    this._flags = flags
    this._data = data
  }

  private static _create(
    op: CppSdCmdType,
    path: string,
    value?: any | MutateInMacro,
    options?: {
      createPath?: boolean
      multi?: boolean
      xattr?: boolean
    }
  ) {
    if (!options) {
      options = {}
    }

    let flags: CppSdSpecFlag = 0

    if (value instanceof MutateInMacro) {
      value = value._value
      flags |= binding.LCB_SUBDOCSPECS_F_XATTR_MACROVALUES
    }

    if (options.createPath) {
      flags |= binding.LCB_SUBDOCSPECS_F_MKINTERMEDIATES
    }

    if (options.xattr) {
      flags |= binding.LCB_SUBDOCSPECS_F_XATTRPATH
    }

    if (value !== undefined) {
      // BUG(JSCBC-755): As a solution to our oversight of not accepting arrays of
      // values to various sub-document operations, we have exposed an option instead.
      if (!options.multi) {
        value = JSON.stringify(value)
      } else {
        if (!Array.isArray(value)) {
          throw new Error('value must be an array for a multi operation')
        }

        value = JSON.stringify(value)
        value = value.substr(1, value.length - 2)
      }
    }

    return new MutateInSpec(op, path, flags, value)
  }

  static insert(
    path: string,
    value: any,
    options: { createPath?: boolean; xattr?: boolean }
  ): MutateInSpec {
    return this._create(binding.LCBX_SDCMD_DICT_ADD, path, value, options)
  }

  static upsert(
    path: string,
    value: any | MutateInMacro,
    options?: { createPath?: boolean; xattr?: boolean }
  ): MutateInSpec {
    return this._create(binding.LCBX_SDCMD_DICT_UPSERT, path, value, options)
  }

  static replace(
    path: string,
    value: any | MutateInMacro,
    options?: { xattr?: boolean }
  ): MutateInSpec {
    return this._create(binding.LCBX_SDCMD_REPLACE, path, value, options)
  }

  static remove(path: string, options?: { xattr?: boolean }): MutateInSpec {
    return this._create(binding.LCBX_SDCMD_REMOVE, path, undefined, options)
  }

  static arrayAppend(
    path: string,
    value: any | MutateInMacro,
    options?: { createPath?: boolean; multi?: boolean; xattr?: boolean }
  ): MutateInSpec {
    return this._create(binding.LCBX_SDCMD_ARRAY_ADD_LAST, path, value, options)
  }

  static arrayPrepend(
    path: string,
    value: any | MutateInMacro,
    options?: { createPath?: boolean; multi?: boolean; xattr?: boolean }
  ): MutateInSpec {
    return this._create(
      binding.LCBX_SDCMD_ARRAY_ADD_FIRST,
      path,
      value,
      options
    )
  }

  static arrayInsert(
    path: string,
    value: any | MutateInMacro,
    options?: { createPath?: boolean; multi?: boolean; xattr?: boolean }
  ): MutateInSpec {
    return this._create(binding.LCBX_SDCMD_ARRAY_INSERT, path, value, options)
  }

  static arrayAddUnique(
    path: string,
    value: any | MutateInMacro,
    options?: { createPath?: boolean; multi?: boolean; xattr?: boolean }
  ): MutateInSpec {
    return this._create(
      binding.LCBX_SDCMD_ARRAY_ADD_UNIQUE,
      path,
      value,
      options
    )
  }

  static increment(
    path: string,
    value: any,
    options?: { createPath?: boolean; xattr?: boolean }
  ): MutateInSpec {
    return this._create(binding.LCBX_SDCMD_COUNTER, path, +value, options)
  }

  static decrement(
    path: string,
    value: any,
    options?: { createPath?: boolean; xattr?: boolean }
  ): MutateInSpec {
    return this._create(binding.LCBX_SDCMD_COUNTER, path, +value, options)
  }
}
