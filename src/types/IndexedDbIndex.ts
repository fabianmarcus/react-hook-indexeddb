/**
 * Defines the structure of an index in IndexedDB,
 * including its name, key path, and optional parameters.
 */
export type IndexedDbIndex = {
  name: string;
  keyPath: string;
  options?: IDBIndexParameters;
};
