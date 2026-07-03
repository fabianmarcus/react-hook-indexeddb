import { IndexedDbIndex } from "./IndexedDbIndex";

/**
 * Defines the properties required to initialize the useIndexedDb hook,
 * including the name of the object store to interact with, a list of
 * all available object stores, and optional indexes for querying the database.
 *
 * @remarks `dbName`, `dbVersion`, `objectStore`, `allObjectStores` and `indexes`
 * are treated as initialization-only values. They are read once when the hook
 * mounts and must not change over the component lifetime. Pass stable references
 * (constants or values defined outside the component) to avoid stale closures
 * or unintended re-connections.
 */
export type HookProps = {
  objectStore: string;
  allObjectStores: string[];
  indexes?: IndexedDbIndex[];
  dbName?: string;
  dbVersion?: number;
};
