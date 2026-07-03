import { IndexedDbIndex } from "./IndexedDbIndex";

/**
 * Defines the properties required to initialize the useIndexedDb hook,
 * including the name of the object store to interact with, a list of
 * all available object stores, and optional indexes for querying the database.
 */
export type HookProps = {
  objectStore: string;
  allObjectStores: string[];
  indexes?: IndexedDbIndex[];
  dbName?: string;
  dbVersion?: number;
};
