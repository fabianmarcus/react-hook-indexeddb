// src/hook.indexeddb.ts
import { useCallback, useEffect, useState } from "react";
var ERROR_NO_DB = new Error("IndexedDB is not initialized");
var ID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
var ID_UUID_PREFIX = "idb-";
function generateLocalId(prefix) {
  const prefixToUse = typeof prefix === "string" ? prefix : ID_UUID_PREFIX;
  return `${prefixToUse}${crypto.randomUUID()}`;
}
function isLocalId(id, prefix) {
  const isUUID = (id2) => ID_REGEX.test(id2);
  const prefixToUse = typeof prefix === "string" ? prefix : ID_UUID_PREFIX;
  return id.startsWith(`${prefixToUse}`) && isUUID(id.replace(new RegExp(`^${prefixToUse}`), ""));
}
function useIndexedDb(props) {
  const { allObjectStores, objectStore, indexes } = props;
  const dbVersion = 1;
  const dbName = "mal-ehrlich-database";
  const [is, setIs] = useState({
    loading: false,
    saving: false,
    deleting: false,
    querying: false,
    initialized: false
  });
  const [db, setDb] = useState(null);
  const [dbError, setDbError] = useState(null);
  const [queryError, setQueryError] = useState(null);
  const [items, setItems] = useState(null);
  const loadItems = useCallback(
    (filter) => {
      return new Promise((resolve, reject) => {
        if (!db) {
          console.info(
            "IndexedDB with its stores hasn't been created yet. It has now."
          );
          const initialResult = [];
          setItems(initialResult);
          resolve(initialResult);
          return;
        }
        setQueryError(null);
        setIs((prev) => ({ ...prev, loading: true }));
        const query = db.transaction(objectStore, "readonly").objectStore(objectStore).getAll();
        query.onsuccess = (ev) => {
          const items2 = ev.target.result;
          const filtered = filter ? items2.filter(filter) : items2;
          console.log("Local items from IndexedDB:", filtered);
          setIs((prev) => ({ ...prev, loading: false }));
          setItems(filtered);
          resolve(filtered);
        };
        query.onerror = (ev) => {
          const cause = ev.target.error;
          const error = Object.assign(
            new Error("Failed to load items from IndexedDB"),
            { cause }
          );
          setIs((prev) => ({ ...prev, loading: false }));
          setQueryError(error);
          reject(error);
        };
      });
    },
    [db, objectStore]
  );
  const saveItem = useCallback(
    (item) => {
      return new Promise((resolve, reject) => {
        if (!db) {
          setQueryError(ERROR_NO_DB);
          reject(ERROR_NO_DB);
          return;
        }
        setQueryError(null);
        setIs((prev) => ({ ...prev, saving: true }));
        const query = db.transaction(objectStore, "readwrite").objectStore(objectStore).add(item);
        query.onsuccess = () => {
          setItems((prev) => prev ? [...prev, item] : [item]);
          setIs((prev) => ({ ...prev, saving: false }));
          console.log("Item saved locally:", item);
          resolve(item);
        };
        query.onerror = (ev) => {
          const cause = ev.target.error;
          const error = Object.assign(
            new Error("Failed to save item to IndexedDB"),
            { cause }
          );
          setQueryError(error);
          setIs((prev) => ({ ...prev, saving: false }));
          reject(error);
        };
      });
    },
    [db, objectStore]
  );
  const removeItem = useCallback(
    (id) => {
      return new Promise((resolve, reject) => {
        if (!db) {
          setQueryError(ERROR_NO_DB);
          reject(ERROR_NO_DB);
          return;
        }
        setQueryError(null);
        setIs((prev) => ({ ...prev, deleting: true }));
        const query = db.transaction(objectStore, "readwrite").objectStore(objectStore).delete(id);
        query.onsuccess = () => {
          const byId = (q) => q.id !== id;
          setItems((prev) => prev ? prev.filter(byId) : null);
          setIs((prev) => ({ ...prev, deleting: false }));
          console.log("Item deleted locally, ID:", id);
          resolve(id);
        };
        query.onerror = (ev) => {
          const cause = ev.target.error;
          const error = Object.assign(
            new Error("Failed to delete item from IndexedDB"),
            { cause }
          );
          setQueryError(error);
          setIs((prev) => ({ ...prev, deleting: false }));
          reject(error);
        };
      });
    },
    [db, objectStore]
  );
  const updateItem = useCallback(
    (q, id) => {
      return new Promise((resolve, reject) => {
        if (!db) {
          setQueryError(ERROR_NO_DB);
          reject(ERROR_NO_DB);
          return;
        }
        setQueryError(null);
        setIs((prev) => ({ ...prev, saving: true }));
        const query = db.transaction(objectStore, "readwrite").objectStore(objectStore).put(q);
        query.onsuccess = () => {
          setItems((prev) => {
            if (!prev) return null;
            return prev.map((item) => item.id === id ? q : item);
          });
          setIs((prev) => ({ ...prev, saving: false }));
          console.log("Item updated locally:", q);
          resolve(q);
        };
        query.onerror = (ev) => {
          const cause = ev.target.error;
          const error = Object.assign(
            new Error("Failed to update item in IndexedDB"),
            { cause }
          );
          setIs((prev) => ({ ...prev, saving: false }));
          setQueryError(error);
          reject(error);
        };
      });
    },
    [db, objectStore]
  );
  const getItemsByIndex = useCallback(
    (select) => {
      return new Promise((resolve, reject) => {
        if (!db) {
          setQueryError(ERROR_NO_DB);
          reject(ERROR_NO_DB);
          return;
        }
        setQueryError(null);
        setIs((prev) => ({ ...prev, querying: true }));
        const transaction = db.transaction(objectStore, "readonly");
        const store = transaction.objectStore(objectStore);
        const index = store.index(select.index.name);
        const query = index.getAll(select.id);
        query.onsuccess = (ev) => {
          const results = ev.target.result;
          setIs((prev) => ({ ...prev, querying: false }));
          console.log(
            `Fetched items by index "${select.index.name}" with id "${select.id}":`,
            results
          );
          resolve(results);
        };
        query.onerror = (ev) => {
          const cause = ev.target.error;
          const error = Object.assign(
            new Error("Failed to fetch items by index from IndexedDB"),
            { cause }
          );
          setIs((prev) => ({ ...prev, querying: false }));
          setQueryError(error);
          reject(error);
        };
      });
    },
    [db, objectStore]
  );
  useEffect(() => {
    const request = indexedDB.open(dbName, dbVersion);
    request.onsuccess = (event) => {
      const database = event.target.result;
      console.log("IndexedDB initialized:", database);
      setDb(database);
      if (database.objectStoreNames.contains(objectStore)) {
        setIs((prev) => ({ ...prev, initialized: true }));
      }
    };
    request.onerror = (event) => {
      const cause = event.target.error;
      const error = Object.assign(new Error("Failed to open IndexedDB"), {
        cause
      });
      console.error(error);
      setDbError(error);
      setIs((prev) => ({ ...prev, initialized: true }));
    };
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      for (const objectStore2 of allObjectStores) {
        if (!database.objectStoreNames.contains(objectStore2)) {
          const store = database.createObjectStore(objectStore2, {
            keyPath: "id"
          });
          if (indexes) {
            indexes.forEach((index) => {
              store.createIndex(index.name, index.keyPath, index.options);
            });
          }
          console.log(`Object store "${objectStore2}" created in IndexedDB.`);
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
    isLocalId
  };
}
export {
  generateLocalId,
  isLocalId,
  useIndexedDb
};
