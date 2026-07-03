import { isLocalId } from "./functions/isLocalId";
import { ERROR_NO_DB } from "./constants/ERROR_NO_DB";
import { useCallback, useEffect, useState } from "react";
import { generateLocalId } from "./functions/generateLocalId";

import type { HookProps } from "./types/HookProps";
import type { UseIndexedDb } from "./types/UseIndexedDb";
import type { IndexedDbIndex } from "./types/IndexedDbIndex";

//--- Hook -----

export function useIndexedDb<T extends { id: string }>(props: HookProps) {
  const { allObjectStores, objectStore, indexes } = props;

  const dbVersion = 1;
  const dbName = "my-database";

  //--- States -----

  const [is, setIs] = useState<UseIndexedDb<T>["is"]>({
    loading: false,
    saving: false,
    deleting: false,
    querying: false,
    initialized: false,
  });
  const [db, setDb] = useState<IDBDatabase | null>(null);
  const [dbError, setDbError] = useState<Error | null>(null);
  const [queryError, setQueryError] = useState<Error | null>(null);
  const [items, setItems] = useState<T[] | null>(null);

  //--- Functions -----

  const loadItems = useCallback(
    (filter?: (item: T) => boolean) => {
      return new Promise<T[]>((resolve, reject) => {
        if (!db) {
          console.info(
            "IndexedDB with its stores hasn't been created yet. It has now.",
          );
          const initialResult = [] as T[];
          setItems(initialResult);
          resolve(initialResult);
          return;
        }
        setQueryError(null);
        setIs((prev) => ({ ...prev, loading: true }));

        const query = db
          .transaction(objectStore, "readonly")
          .objectStore(objectStore)
          .getAll();

        query.onsuccess = (ev) => {
          const items = (ev.target as IDBRequest).result as T[];
          const filtered = filter ? items.filter(filter) : items;
          console.log("Local items from IndexedDB:", filtered);
          setIs((prev) => ({ ...prev, loading: false }));
          setItems(filtered);
          resolve(filtered);
        };
        query.onerror = (ev) => {
          const cause = (ev.target as IDBRequest).error;
          const error = Object.assign(
            new Error("Failed to load items from IndexedDB"),
            { cause },
          );
          setIs((prev) => ({ ...prev, loading: false }));
          setQueryError(error);
          reject(error);
        };
      });
    },
    [db, objectStore],
  );

  const saveItem = useCallback(
    (item: T) => {
      return new Promise<T>((resolve, reject) => {
        if (!db) {
          setQueryError(ERROR_NO_DB);
          reject(ERROR_NO_DB);
          return;
        }
        setQueryError(null);
        setIs((prev) => ({ ...prev, saving: true }));

        const query = db
          .transaction(objectStore, "readwrite")
          .objectStore(objectStore)
          .add(item);

        query.onsuccess = () => {
          setItems((prev) => (prev ? [...prev, item] : [item]));
          setIs((prev) => ({ ...prev, saving: false }));
          console.log("Item saved locally:", item);
          resolve(item);
        };
        query.onerror = (ev) => {
          const cause = (ev.target as IDBRequest).error;
          const error = Object.assign(
            new Error("Failed to save item to IndexedDB"),
            { cause },
          );
          setQueryError(error);
          setIs((prev) => ({ ...prev, saving: false }));
          reject(error);
        };
      });
    },
    [db, objectStore],
  );

  const removeItem = useCallback(
    (id: string) => {
      return new Promise<string>((resolve, reject) => {
        if (!db) {
          setQueryError(ERROR_NO_DB);
          reject(ERROR_NO_DB);
          return;
        }
        setQueryError(null);
        setIs((prev) => ({ ...prev, deleting: true }));

        const query = db
          .transaction(objectStore, "readwrite")
          .objectStore(objectStore)
          .delete(id);

        query.onsuccess = () => {
          const byId = (q: T) => q.id !== id;
          setItems((prev) => (prev ? prev.filter(byId) : null));
          setIs((prev) => ({ ...prev, deleting: false }));
          console.log("Item deleted locally, ID:", id);
          resolve(id);
        };
        query.onerror = (ev) => {
          const cause = (ev.target as IDBRequest).error;
          const error = Object.assign(
            new Error("Failed to delete item from IndexedDB"),
            { cause },
          );
          setQueryError(error);
          setIs((prev) => ({ ...prev, deleting: false }));
          reject(error);
        };
      });
    },
    [db, objectStore],
  );

  const updateItem = useCallback(
    (q: T) => {
      return new Promise<T>((resolve, reject) => {
        if (!db) {
          setQueryError(ERROR_NO_DB);
          reject(ERROR_NO_DB);
          return;
        }
        setQueryError(null);
        setIs((prev) => ({ ...prev, saving: true }));

        const query = db
          .transaction(objectStore, "readwrite")
          .objectStore(objectStore)
          .put(q);

        query.onsuccess = () => {
          setItems((prev) => {
            if (!prev) return null;
            return prev.map((item) => (item.id === q.id ? q : item));
          });
          setIs((prev) => ({ ...prev, saving: false }));
          console.log("Item updated locally:", q);
          resolve(q);
        };
        query.onerror = (ev) => {
          const cause = (ev.target as IDBRequest).error;
          const error = Object.assign(
            new Error("Failed to update item in IndexedDB"),
            { cause },
          );
          setIs((prev) => ({ ...prev, saving: false }));
          setQueryError(error);
          reject(error);
        };
      });
    },
    [db, objectStore],
  );

  const getItemsByIndex = useCallback(
    (select: { index: IndexedDbIndex; id: string }) => {
      return new Promise<T[]>((resolve, reject) => {
        if (!db) {
          setQueryError(ERROR_NO_DB);
          reject(ERROR_NO_DB);
          return;
        }
        setQueryError(null);
        setIs((prev) => ({ ...prev, querying: true }));

        try {
          const transaction = db.transaction(objectStore, "readonly");
          const store = transaction.objectStore(objectStore);
          const index = store.index(select.index.name);
          const query = index.getAll(select.id);

          query.onsuccess = (ev) => {
            const results = (ev.target as IDBRequest).result as T[];
            setIs((prev) => ({ ...prev, querying: false }));
            console.log(
              `Fetched items by index "${select.index.name}" with id "${select.id}":`,
              results,
            );
            resolve(results);
          };
          query.onerror = (ev) => {
            const cause = (ev.target as IDBRequest).error;
            const error = Object.assign(
              new Error("Failed to fetch items by index from IndexedDB"),
              { cause },
            );
            setIs((prev) => ({ ...prev, querying: false }));
            setQueryError(error);
            reject(error);
          };
        } catch (cause) {
          // Synchroner Fehler, z. B. Index oder Object Store existiert nicht
          const error = Object.assign(
            new Error("Failed to fetch items by index from IndexedDB"),
            { cause },
          );
          setIs((prev) => ({ ...prev, querying: false }));
          setQueryError(error);
          reject(error);
        }
      });
    },
    [db, objectStore],
  );

  //--- Lifecycle Effects -----

  /**
   * Opens a connection to the IndexedDB and initializes
   * the Object Store if it does not already exist.
   */
  useEffect(() => {
    const request = indexedDB.open(dbName, dbVersion);

    request.onsuccess = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      console.log("IndexedDB initialized:", database);
      setDb(database);
      if (database.objectStoreNames.contains(objectStore)) {
        setIs((prev) => ({ ...prev, initialized: true }));
      }
    };
    request.onerror = (event) => {
      const cause = (event.target as IDBOpenDBRequest).error;
      const error = Object.assign(new Error("Failed to open IndexedDB"), {
        cause,
      });
      console.error(error);
      setDbError(error);
      setIs((prev) => ({ ...prev, initialized: true }));
    };
    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      for (const objectStore of allObjectStores) {
        if (!database.objectStoreNames.contains(objectStore)) {
          const store = database.createObjectStore(objectStore, {
            keyPath: "id",
          });
          if (indexes) {
            indexes.forEach((index) => {
              store.createIndex(index.name, index.keyPath, index.options);
            });
          }
          console.log(`Object store "${objectStore}" created in IndexedDB.`);
        }
      }
      setIs((prev) => ({ ...prev, initialized: true }));
    };
  }, [allObjectStores, objectStore, indexes]);

  useEffect(() => {
    return () => {
      db?.close();
    };
  }, [db]);

  //--- Hook Exports -----

  return {
    is,
    items,
    dbError,
    queryError,
    loadItems,
    saveItem,
    removeItem,
    updateItem,
    getItemsByIndex,
    generateLocalId,
    isLocalId,
  } as UseIndexedDb<T>;
}
