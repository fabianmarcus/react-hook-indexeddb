import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { generateLocalId } from "../src/functions/generateLocalId";
import { isLocalId } from "../src/functions/isLocalId";
import { useIndexedDb } from "../src/hook.indexeddb";

type Todo = {
  id: string;
  title: string;
  category: string;
};

const DB_NAME = "test-database";

function deleteDb() {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

describe("id utilities", () => {
  it("generates and validates local ids with default prefix", () => {
    const id = generateLocalId();

    expect(id.startsWith("idb-")).toBe(true);
    expect(isLocalId(id)).toBe(true);
  });

  it("supports custom prefixes", () => {
    const id = generateLocalId("todo-");

    expect(id.startsWith("todo-")).toBe(true);
    expect(isLocalId(id, "todo-")).toBe(true);
    expect(isLocalId(id)).toBe(false);
  });

  it("rejects invalid values", () => {
    expect(isLocalId("idb-not-a-uuid")).toBe(false);
    expect(isLocalId("random-value")).toBe(false);
  });
});

describe("useIndexedDb", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(async () => {
    cleanup();
    await deleteDb();
    vi.restoreAllMocks();
  });

  it("loads empty state before first insert", async () => {
    const allObjectStores = ["todos"];

    const { result, unmount } = renderHook(() =>
      useIndexedDb<Todo>({
        objectStore: "todos",
        allObjectStores,
        dbName: DB_NAME,
      }),
    );

    await waitFor(() => expect(result.current.is.initialized).toBe(true));

    let loaded: Todo[] = [];

    await act(async () => {
      loaded = await result.current.loadItems();
    });

    expect(loaded).toEqual([]);
    expect(result.current.items).toEqual([]);

    unmount();
  });

  it("saves, updates and removes items", async () => {
    const allObjectStores = ["todos"];

    const { result, unmount } = renderHook(() =>
      useIndexedDb<Todo>({
        objectStore: "todos",
        allObjectStores,
        dbName: DB_NAME,
      }),
    );

    await waitFor(() => expect(result.current.is.initialized).toBe(true));

    const item: Todo = { id: "1", title: "first", category: "work" };

    await act(async () => {
      await result.current.saveItem(item);
    });

    await act(async () => {
      await result.current.loadItems();
    });

    expect(result.current.items).toEqual([item]);

    const updated: Todo = { ...item, title: "updated" };

    await act(async () => {
      await result.current.updateItem(updated);
    });

    await act(async () => {
      await result.current.loadItems();
    });

    expect(result.current.items).toEqual([updated]);

    await act(async () => {
      await result.current.removeItem(item.id);
    });

    await act(async () => {
      await result.current.loadItems();
    });

    expect(result.current.items).toEqual([]);

    unmount();
  });

  it("queries items by index", async () => {
    const allObjectStores = ["todos"];
    const indexes = [{ name: "category", keyPath: "category" }];

    const { result, unmount } = renderHook(() =>
      useIndexedDb<Todo>({
        objectStore: "todos",
        allObjectStores,
        indexes,
        dbName: DB_NAME,
      }),
    );

    await waitFor(() => expect(result.current.is.initialized).toBe(true));

    await act(async () => {
      await result.current.saveItem({ id: "1", title: "a", category: "work" });
      await result.current.saveItem({
        id: "2",
        title: "b",
        category: "private",
      });
      await result.current.saveItem({ id: "3", title: "c", category: "work" });
    });

    let workItems: Todo[] = [];

    await act(async () => {
      workItems = await result.current.getItemsByIndex({
        index: { name: "category", keyPath: "category" },
        id: "work",
      });
    });

    expect(workItems.map((item) => item.id)).toEqual(["1", "3"]);
    expect(result.current.is.querying).toBe(false);

    unmount();
  });
});
