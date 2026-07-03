# react-indexeddb-hook

Reusable React hook for IndexedDB CRUD operations in modern browsers.

## Requirements

- React 18 or newer
- Browser runtime with IndexedDB support

This package is browser-only. It is not designed to run in Node.js environments.

## Install

From npm:

```bash
npm install react-indexeddb-hook
```

From GitHub Packages:

```bash
npm install @fabianmarcus/react-indexeddb-hook
```

If your project does not already use GitHub Packages, add an `.npmrc` with the scope mapping:

```ini
@fabianmarcus:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=GITHUB_TOKEN
```

Replace `GITHUB_TOKEN` with a personal access token that has package read access.

## Publish To GitHub Packages

The repository contains a GitHub Actions workflow in `.github/workflows/publish-package.yml`.
It publishes the package automatically when you create a GitHub Release, or manually via `workflow_dispatch`.

For a local publish, authenticate npm against GitHub Packages and run:

```bash
npm publish
```

## Basic Usage

```tsx
import { useEffect } from "react";
import { useIndexedDb } from "react-indexeddb-hook";

type Todo = {
  id: string;
  title: string;
  done: boolean;
};

export function TodoList() {
  const {
    is,
    items,
    loadItems,
    saveItem,
    queryError,
  } = useIndexedDb<Todo>({
    objectStore: "todos",
    allObjectStores: ["todos"],
    indexes: [{ name: "title", keyPath: "title" }],
  });

  useEffect(() => {
    if (is.initialized) {
      void loadItems();
    }
  }, [is.initialized, loadItems]);

  if (queryError) {
    return <p>{queryError.message}</p>;
  }

  return (
    <div>
      <button
        onClick={() =>
          void saveItem({ id: crypto.randomUUID(), title: "Learn IndexedDB", done: false })
        }
      >
        Add item
      </button>
      <ul>
        {(items ?? []).map((item) => (
          <li key={item.id}>{item.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

## API

```ts
export type IndexedDbIndex = {
  name: string;
  keyPath: string;
  options?: IDBIndexParameters;
};

export type HookProps = {
  objectStore: string;
  allObjectStores: string[];
  indexes?: IndexedDbIndex[];
};

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
  updateItem: (q: T) => Promise<T>;
  loadItems: (filter?: (item: T) => boolean) => Promise<T[]>;
  isLocalId: (id: string, prefix?: string) => boolean;
  generateLocalId: (prefix?: string) => string;
  getItemsByIndex: (select: {
    index: IndexedDbIndex;
    id: string;
  }) => Promise<T[]>;
};
```
