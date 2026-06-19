import { IndexedDbIndex } from "./IndexedDbIndex";

/**
 * Defines the structure of the object returned by the useIndexedDb hook,
 * including the state of the hook, the items retrieved from IndexedDB,
 * any errors that occurred, and the functions to interact with the database.
 */
export type UseIndexedDb<T> = {
  is: {
    saving: boolean;
    loading: boolean;
    deleting: boolean;
    querying: boolean;
    initialized: boolean;
  };
  items: T[] | null;
  dbError: Error | null;
  queryError: Error | null;
  saveItem: (q: T) => Promise<T>;
  removeItem: (id: string) => Promise<string>;
  updateItem: (q: T, id: string) => Promise<T>;
  loadItems: (filter?: (item: T) => boolean) => Promise<T[]>;
  isLocalId: (id: string, prefix?: string) => boolean;
  generateLocalId: (prefix?: string) => string;
  getItemsByIndex: (select: {
    index: IndexedDbIndex;
    id: string;
  }) => Promise<T[]>;
};
