export const enum ServiceType {
  KeyValue = 'kv',
  Management = 'mgmt',
  Views = 'views',
  Query = 'query',
  Search = 'search',
  Analytics = 'analytics',
}

export const enum DurabilityLevel {
  None = 0,
  Majority = 1,
  MajorityAndPersistOnMaster = 2,
  PersistToMajority = 3,
}
