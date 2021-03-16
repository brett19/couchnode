import { Cluster } from './cluster'
import { CouchbaseError, GroupNotFoundError, UserNotFoundError } from './errors'
import { HttpExecutor, HttpMethod, HttpServiceType } from './httpexecutor'
import { cbQsStringify, NodeCallback, PromiseHelper } from './utilities'

/**
 * @category Management
 */
export class Origin {
  type: string
  name: string

  /**
   * @internal
   */
  constructor(data: Origin) {
    this.type = data.type
    this.name = data.name
  }

  /**
   * @internal
   */
  static _fromNsData(data: any): Origin {
    return new Origin({
      type: data.type,
      name: data.name,
    })
  }
}

/**
 * @category Management
 */
export class Role {
  name: string
  bucket: string | undefined
  scope: string | undefined
  collection: string | undefined

  /**
   * @internal
   */
  constructor(data: Role) {
    this.name = data.name
    this.bucket = data.bucket
    this.scope = data.scope
    this.collection = data.collection
  }

  /**
   * @internal
   */
  static _fromNsData(data: any): Role {
    return new Role({
      name: data.name,
      bucket: data.bucket_name,
      scope: data.scope_name,
      collection: data.collection_name,
    })
  }

  /**
   * @internal
   */
  static _toNsStr(role: string | Role): string {
    if (typeof role === 'string') {
      return role
    }

    if (role.bucket && role.scope && role.collection) {
      return `${role.name}[${role.bucket}:${role.scope}:${role.collection}]`
    } else if (role.bucket && role.scope) {
      return `${role.name}[${role.bucket}:${role.scope}]`
    } else if (role.bucket) {
      return `${role.name}[${role.bucket}]`
    } else {
      return role.name
    }
  }
}

/**
 * @category Management
 */
export class RoleAndDescription extends Role {
  displayName: string
  description: string

  /**
   * @internal
   */
  constructor(data: RoleAndDescription) {
    super(data)
    this.displayName = data.displayName
    this.description = data.description
  }

  /**
   * @internal
   */
  static _fromNsData(data: any): RoleAndDescription {
    return new RoleAndDescription({
      ...Role._fromNsData(data),
      displayName: data.name,
      description: data.description,
    })
  }
}

/**
 * @category Management
 */
export class RoleAndOrigin extends Role {
  origins: Origin[]

  /**
   * @internal
   */
  constructor(data: RoleAndOrigin) {
    super(data)
    this.origins = data.origins
  }

  /**
   * @internal
   */
  static _fromNsData(data: any): RoleAndOrigin {
    let origins: Origin[]
    if (data.origins) {
      origins = data.origins.map((originData: any) => new Origin(originData))
    } else {
      origins = []
    }

    return new RoleAndOrigin({
      ...Role._fromNsData(data),
      origins,
    })
  }
}

/**
 * @category Management
 */
export interface IUser {
  username: string
  displayName?: string
  groups?: string[]
  roles?: (Role | string)[]
  password?: string
}

/**
 * @category Management
 */
export class User implements IUser {
  username: string
  displayName: string
  groups: string[]
  roles: Role[]
  password: undefined

  /**
   * @internal
   */
  constructor(data: User) {
    this.username = data.username
    this.displayName = data.displayName
    this.groups = data.groups
    this.roles = data.roles
  }

  /**
   * @internal
   */
  static _fromNsData(data: any): User {
    let roles: Role[]
    if (data.roles) {
      roles = data.roles
        .filter((roleData: any) => {
          // Check whether or not this role has originated from the user directly
          // or whether it was through a group.
          if (!roleData.origins || roleData.origins.length === 0) {
            return false
          }
          return !!roleData.origins.find(
            (originData: any) => originData.type === 'user'
          )
        })
        .map((roleData: any) => new Role(roleData))
    } else {
      roles = []
    }

    return new User({
      username: data.id,
      displayName: data.name,
      groups: data.groups,
      roles: roles,
      password: undefined,
    })
  }

  /**
   * @internal
   */
  static _toNsData(user: IUser): any {
    let groups: any = undefined
    if (user.groups && user.groups.length > 0) {
      groups = user.groups
    }

    let roles: any = undefined
    if (user.roles && user.roles.length > 0) {
      roles = user.roles.map((role) => Role._toNsStr(role)).join(',')
    }

    return {
      name: user.displayName,
      groups: groups,
      password: user.password,
      roles: roles,
    }
  }
}

/**
 * @category Management
 */
export class UserAndMetadata extends User {
  domain: string
  effectiveRoles: RoleAndOrigin[]
  passwordChanged: Date
  externalGroups: string[]

  /**
   * @deprecated
   */
  get effectiveRolesAndOrigins(): RoleAndOrigin[] {
    return this.effectiveRoles
  }

  /**
   * @internal
   */
  constructor(data: UserAndMetadata) {
    super(data)
    this.domain = data.domain
    this.effectiveRoles = data.effectiveRoles
    this.passwordChanged = data.passwordChanged
    this.externalGroups = data.externalGroups
  }

  /**
   * @internal
   */
  static _fromNsData(data: any): UserAndMetadata {
    let effectiveRoles: RoleAndOrigin[]
    if (data.roles) {
      effectiveRoles = data.roles.map((roleData: any) =>
        RoleAndOrigin._fromNsData(roleData)
      )
    } else {
      effectiveRoles = []
    }

    return new UserAndMetadata({
      ...User._fromNsData(data),
      domain: data.domain,
      effectiveRoles: effectiveRoles,
      effectiveRolesAndOrigins: effectiveRoles,
      passwordChanged: new Date(data.password_change_date),
      externalGroups: data.external_groups,
    })
  }
}

/**
 * @category Management
 */
export interface IGroup {
  name: string
  description?: string
  roles?: (Role | string)[]
  ldapGroupReference?: string
}

/**
 * @category Management
 */
export class Group {
  name: string
  description: string
  roles: Role[]
  ldapGroupReference: string | undefined

  /**
   * @internal
   */
  constructor(data: Group) {
    this.name = data.name
    this.description = data.description
    this.roles = data.roles
    this.ldapGroupReference = data.ldapGroupReference
  }

  /**
   * @internal
   */
  static _fromNsData(data: any): Group {
    let roles: Role[]
    if (data.roles) {
      roles = data.roles.map((roleData: any) => new Role(roleData))
    } else {
      roles = []
    }

    return new Group({
      name: data.id,
      description: data.description,
      roles: roles,
      ldapGroupReference: data.ldap_group_reference,
    })
  }

  /**
   * @internal
   */
  static _toNsData(group: IGroup): any {
    let roles: any = undefined
    if (group.roles && group.roles.length > 0) {
      roles = group.roles.map((role) => Role._toNsStr(role)).join(',')
    }

    return {
      description: group.description,
      roles: roles,
      ldap_group_reference: group.ldapGroupReference,
    }
  }
}

/**
 * @category Management
 */
export interface GetUserOptions {
  domainName?: string
  timeout?: number
}

/**
 * @category Management
 */
export interface GetAllUsersOptions {
  domainName?: string
  timeout?: number
}

/**
 * @category Management
 */
export interface UpsertUserOptions {
  domainName?: string
  timeout?: number
}

/**
 * @category Management
 */
export interface DropUserOptions {
  domainName?: string
  timeout?: number
}

/**
 * @category Management
 */
export interface GetRolesOptions {
  timeout?: number
}

/**
 * @category Management
 */
export interface GetGroupOptions {
  timeout?: number
}

/**
 * @category Management
 */
export interface GetAllGroupsOptions {
  timeout?: number
}

/**
 * @category Management
 */
export interface UpsertGroupOptions {
  timeout?: number
}

/**
 * @category Management
 */
export interface DropGroupOptions {
  timeout?: number
}

/**
 * @category Management
 */
export class UserManager {
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

  async getUser(
    username: string,
    options?: GetUserOptions,
    callback?: NodeCallback<UserAndMetadata>
  ): Promise<UserAndMetadata> {
    if (options instanceof Function) {
      callback = arguments[1]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    const domainName = options.domainName || 'local'
    const timeout = options.timeout
    return PromiseHelper.wrapAsync(async () => {
      const res = await this._http.request({
        type: HttpServiceType.Management,
        method: HttpMethod.Get,
        path: `/settings/rbac/users/${domainName}/${username}`,
        timeout: timeout,
      })

      if (res.statusCode !== 200) {
        const errCtx = HttpExecutor.errorContextFromResponse(res)

        if (res.statusCode === 404) {
          throw new UserNotFoundError(undefined, errCtx)
        }

        throw new CouchbaseError('failed to get the user', undefined, errCtx)
      }

      const userData = JSON.parse(res.body.toString())
      return new UserAndMetadata(userData)
    }, callback)
  }

  async getAllUsers(
    options?: GetAllUsersOptions,
    callback?: NodeCallback<UserAndMetadata[]>
  ): Promise<UserAndMetadata[]> {
    if (options instanceof Function) {
      callback = arguments[0]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    const domainName = options.domainName || 'local'
    const timeout = options.timeout
    return PromiseHelper.wrapAsync(async () => {
      const res = await this._http.request({
        type: HttpServiceType.Management,
        method: HttpMethod.Get,
        path: `/settings/rbac/users/${domainName}`,
        timeout: timeout,
      })

      if (res.statusCode !== 200) {
        const errCtx = HttpExecutor.errorContextFromResponse(res)

        throw new CouchbaseError('failed to get users', undefined, errCtx)
      }

      const usersData = JSON.parse(res.body.toString())
      const users = usersData.map(
        (userData: any) => new UserAndMetadata(userData)
      )
      return users
    }, callback)
  }

  async upsertUser(
    user: IUser,
    options?: UpsertUserOptions,
    callback?: NodeCallback<void>
  ): Promise<void> {
    if (options instanceof Function) {
      callback = arguments[1]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    const domainName = options.domainName || 'local'
    const timeout = options.timeout
    return PromiseHelper.wrapAsync(async () => {
      const userData = User._toNsData(user)

      const res = await this._http.request({
        type: HttpServiceType.Management,
        method: HttpMethod.Put,
        path: `/settings/rbac/users/${domainName}/${user.username}`,
        contentType: 'application/x-www-form-urlencoded',
        body: cbQsStringify(userData),
        timeout: timeout,
      })

      if (res.statusCode !== 200) {
        const errCtx = HttpExecutor.errorContextFromResponse(res)

        throw new CouchbaseError('failed to upsert user', undefined, errCtx)
      }
    }, callback)
  }

  async dropUser(
    username: string,
    options?: DropUserOptions,
    callback?: NodeCallback<void>
  ): Promise<void> {
    if (options instanceof Function) {
      callback = arguments[1]
      options = undefined
    }
    if (!options) {
      options = {}
    }

    const domainName = options.domainName || 'local'
    const timeout = options.timeout
    return PromiseHelper.wrapAsync(async () => {
      const res = await this._http.request({
        type: HttpServiceType.Management,
        method: HttpMethod.Delete,
        path: `/settings/rbac/users/${domainName}/${username}`,
        timeout: timeout,
      })

      if (res.statusCode !== 200) {
        const errCtx = HttpExecutor.errorContextFromResponse(res)

        if (res.statusCode === 404) {
          throw new UserNotFoundError(undefined, errCtx)
        }

        throw new CouchbaseError('failed to drop the user', undefined, errCtx)
      }
    }, callback)
  }

  async getRoles(
    options?: GetRolesOptions,
    callback?: NodeCallback<Role[]>
  ): Promise<Role[]> {
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
        path: `/settings/rbac/roles`,
        timeout: timeout,
      })

      if (res.statusCode !== 200) {
        const errCtx = HttpExecutor.errorContextFromResponse(res)

        throw new CouchbaseError('failed to get roles', undefined, errCtx)
      }

      const rolesData = JSON.parse(res.body.toString())
      const roles = rolesData.map((roleData: any) =>
        RoleAndDescription._fromNsData(roleData)
      )
      return roles
    }, callback)
  }

  async getGroup(
    groupName: string,
    options?: GetGroupOptions,
    callback?: NodeCallback<Group>
  ): Promise<Group> {
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
        path: `/settings/rbac/groups/${groupName}`,
        timeout: timeout,
      })

      if (res.statusCode !== 200) {
        const errCtx = HttpExecutor.errorContextFromResponse(res)

        if (res.statusCode === 404) {
          throw new GroupNotFoundError(undefined, errCtx)
        }

        throw new CouchbaseError('failed to get the group', undefined, errCtx)
      }

      const groupData = JSON.parse(res.body.toString())
      return Group._fromNsData(groupData)
    }, callback)
  }

  async getAllGroups(
    options?: GetAllGroupsOptions,
    callback?: NodeCallback<Group[]>
  ): Promise<Group[]> {
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
        type: HttpServiceType.Management,
        method: HttpMethod.Get,
        path: `/settings/rbac/groups`,
        timeout: timeout,
      })

      if (res.statusCode !== 200) {
        const errCtx = HttpExecutor.errorContextFromResponse(res)

        throw new CouchbaseError('failed to get groups', undefined, errCtx)
      }

      const groupsData = JSON.parse(res.body.toString())
      const groups = groupsData.map((groupData: any) =>
        Group._fromNsData(groupData)
      )
      return groups
    }, callback)
  }

  async upsertGroup(
    group: IGroup,
    options?: UpsertGroupOptions,
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
      const groupData = Group._toNsData(group)

      const res = await this._http.request({
        type: HttpServiceType.Management,
        method: HttpMethod.Put,
        path: `/settings/rbac/groups/${group.name}`,
        contentType: 'application/x-www-form-urlencoded',
        body: cbQsStringify(groupData),
        timeout: timeout,
      })

      if (res.statusCode !== 200) {
        const errCtx = HttpExecutor.errorContextFromResponse(res)

        throw new CouchbaseError('failed to upsert group', undefined, errCtx)
      }
    }, callback)
  }

  async dropGroup(
    groupName: string,
    options?: DropGroupOptions,
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
        path: `/settings/rbac/groups/${groupName}`,
        timeout: timeout,
      })

      if (res.statusCode !== 200) {
        const errCtx = HttpExecutor.errorContextFromResponse(res)

        if (res.statusCode === 404) {
          throw new GroupNotFoundError(undefined, errCtx)
        }

        throw new CouchbaseError('failed to drop the group', undefined, errCtx)
      }
    }, callback)
  }
}
