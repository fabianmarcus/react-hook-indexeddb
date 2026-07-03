/**
 * This constant represents an error that is thrown when IndexedDB
 * is not initialized. It can be used to handle cases where database
 * operations are attempted without a proper database setup.
 */
export const ERROR_NO_DB = new Error("IndexedDB is not initialized");
