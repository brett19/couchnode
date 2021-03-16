import binding from './binding'
import { Cluster, ConnectOptions } from './cluster'
import { NodeCallback } from './utilities'

/**
 * connect provides an entrypoint into the library.  Connecting to the cluster
 * and exposing the various services and features.
 *
 * @param connStr The connection string to use to connect to the cluster.
 * @param options Optional parameters for this operation.
 * @param callback A node-style callback to be invoked after execution.
 *
 * @category Core
 */
export async function connect(
  connStr: string,
  options?: ConnectOptions,
  callback?: NodeCallback<Cluster>
): Promise<Cluster> {
  return Cluster.connect(connStr, options, callback)
}

/**
 * lcbVersion exposes the underlying libcouchbase library version
 * that is being used by the SDK to perform I/O.
 */
export const lcbVersion: string = binding.lcbVersion

export * from './analyticsindexmanager'
export * from './analyticstypes'
export * from './authenticators'
export * from './binarycollection'
export * from './bucket'
export * from './bucketmanager'
export * from './cluster'
export * from './collection'
export * from './collectionmanager'
export * from './crudoptypes'
export * from './datastructures'
export * from './diagnosticstypes'
export * from './errorcontexts'
export * from './errors'
export * from './generaltypes'
export * from './logging'
export * from './mutationstate'
export * from './queryindexmanager'
export * from './querytypes'
export * from './scope'
export * from './sdspecs'
export * from './searchfacet'
export * from './searchindexmanager'
export * from './searchquery'
export * from './searchsort'
export * from './searchtypes'
export * from './streamablepromises'
export * from './transcoders'
export * from './usermanager'
export * from './viewexecutor'
export * from './viewindexmanager'
export * from './viewtypes'

export { Cas, NodeCallback } from './utilities'
