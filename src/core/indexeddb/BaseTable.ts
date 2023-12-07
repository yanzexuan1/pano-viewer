import { IndexedDbManager } from "./IndexedDbManager";

/**
 * Table is known as ObjectStore in IndexedDb
 */
export class BaseTable {
    db?: IDBDatabase = undefined;
    isCreatingTable = false;

    constructor() {
        // When a new table is implemented, developer need to make sure to add it into IndexedDbManager
        const tables = IndexedDbManager.instance().getTables();
        const i = tables.findIndex((t) => t.name === this.tableName());
        if (i === -1) {
            throw new Error(`Failed to find table '${this.tableName()}' from indexeddb!`);
        }
    }

    /**
     * Derived class have to override this method and return a table name!
     */
    public tableName(): string {
        throw new Error("Derived class have to override 'tableName', and set a proper table name!");
    }

    /**
     * Adds a record to a table
     */
    add(record: any, successCallback?: any, errorCallback?: any) { // eslint-disable-line
        const table = this.tableName();
        IndexedDbManager.instance()
            .getDatabase()
            .then((db) => {
                const objectStore = db.transaction([table], "readwrite").objectStore(table);
                const request = objectStore.add(record);

                request.onsuccess = successCallback;
                request.onerror = errorCallback;
            })
            .finally(() => {
                IndexedDbManager.instance().closeDatabase();
            })
            .catch((reason) => {
                errorCallback && errorCallback(reason);
            });
    }

    /**
     * Saves a record
     */
    save(record: any, successCallback?: any, errorCallback?: any) { // eslint-disable-line
        const table = this.tableName();
        IndexedDbManager.instance()
            .getDatabase()
            .then((db) => {
                const objectStore = db.transaction([table], "readwrite").objectStore(table);
                const request = objectStore.put(record);

                request.onsuccess = successCallback;
                request.onerror = errorCallback;
            })
            .finally(() => {
                IndexedDbManager.instance().closeDatabase();
            });
    }

    /**
     * Deletes a record
     */
    delete(key: string, successCallback?: any, errorCallback?: any) { // eslint-disable-line
        const table = this.tableName();
        IndexedDbManager.instance()
            .getDatabase()
            .then((db) => {
                const objectStore = db.transaction([table], "readwrite").objectStore(table);
                const request = objectStore.delete(key);

                request.onsuccess = successCallback;
                request.onerror = errorCallback;
            })
            .finally(() => {
                IndexedDbManager.instance().closeDatabase();
            });
    }

    /**
     * Updates a record
     */
    update() {
        IndexedDbManager.instance()
            .getDatabase()
            .then((/* db */) => {
                // TODO
            });
    }

    /**
     * Queries records in a table
     * @param cursorHandler callback to handle records one by one
     */
    query(cursorHandler?: any, errorCallback?: any) { // eslint-disable-line
        const table = this.tableName();
        IndexedDbManager.instance()
            .getDatabase()
            .then((db) => {
                const objectStore = db.transaction([table], "readonly").objectStore(table);
                const cursor = objectStore.openCursor();
                cursor.onsuccess = (event: any) => { // eslint-disable-line
                    const csr = event.target.result; // cursor
                    if (csr) {
                        csr.continue();
                    }
                    cursorHandler && cursorHandler(csr);
                };

                cursor.onerror = errorCallback;
            })
            .finally(() => {
                IndexedDbManager.instance().closeDatabase();
            });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryByIndex(indexName: any, indexValue: any, successCallback?: any, errorCallback?: any) {
        const table = this.tableName();
        IndexedDbManager.instance()
            .getDatabase()
            .then((db) => {
                const objectStore = db.transaction([table], "readonly").objectStore(table);
                const request = objectStore.index(indexName).get(indexValue);
                request.onerror = errorCallback;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                request.onsuccess = function (e: any) {
                    const result = e.target?.result;
                    successCallback && successCallback(result);
                };
            })
            .finally(() => {
                IndexedDbManager.instance().closeDatabase();
            });
    }

    queryAll(successCallback?: any, errorCallback?: any) { // eslint-disable-line
        const table = this.tableName();
        IndexedDbManager.instance()
            .getDatabase()
            .then((db) => {
                const objectStore = db.transaction([table], "readonly").objectStore(table);
                const getAllRequest = objectStore.getAll();
                getAllRequest.onsuccess = (event: any) => { // eslint-disable-line
                    successCallback && successCallback(getAllRequest.result);
                };
                getAllRequest.onerror = errorCallback;
            })
            .finally(() => {
                IndexedDbManager.instance().closeDatabase();
            });
    }

    clearAll(successCallback?: any, errorCallback?: any) { // eslint-disable-line
        const table = this.tableName();
        IndexedDbManager.instance()
            .getDatabase()
            .then((db) => {
                const objectStore = db.transaction([table], "readwrite").objectStore(table);
                const objectStoreRequest = objectStore.clear();
                objectStoreRequest.onsuccess = (event) => {
                    successCallback && successCallback(event);
                };
                objectStoreRequest.onerror = (event) => {
                    errorCallback && errorCallback(event);
                };
            })
            .finally(() => {
                IndexedDbManager.instance().closeDatabase();
            });
    }
}
