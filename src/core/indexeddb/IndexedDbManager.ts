import { checkIsNewVersion } from "src/core/VersionManager";
import { log } from "src/core/utils";

/**
 * Definition of an indexeddb table
 */
export interface IndexedDbTable {
    name: string;
    options?: IDBObjectStoreParameters;
    indexArray?: {
        name: string;
        fields: string[];
        unique: boolean;
    }[];
}

/**
 * IndexedDb manager.
 */
export class IndexedDbManager {
    private readonly DATABASE_NAME = "pano_viewer";
    /**
     * Default tables.
     */
    private readonly DEFAULT_TABLES: IndexedDbTable[] = [
        {
            name: "images",
            options: { keyPath: "fileName", autoIncrement: true },
        },
    ];

    private db?: IDBDatabase = undefined;
    private tables = this.DEFAULT_TABLES;

    /**
     * Singleton design pattern
     */
    private static _instance: IndexedDbManager | undefined = undefined;
    public static instance(): IndexedDbManager {
        if (!IndexedDbManager._instance) {
            IndexedDbManager._instance = new IndexedDbManager();
        }
        return IndexedDbManager._instance;
    }

    /**
     * Sets indexeddb tables. This should be called before getDatabase() is called.
     */
    public setTables(tables: IndexedDbTable[]) {
        this.tables = tables;
    }

    /**
     * Gets indexeddb tables.
     */
    public getTables(): IndexedDbTable[] {
        return this.tables;
    }

    /**
     * Makes sure to open database, and the table is already created before add/put/delete, etc.
     */
    public async getDatabase(): Promise<IDBDatabase> {
        // if (!this.db) {
        // for the first time to open db, trigger upgrade event and create tables
        let db = await this.getDB(this.DATABASE_NAME);
        if (!this.db) {
            db.close();
            if (checkIsNewVersion()) {
                await this.deleteDataBase(this.DATABASE_NAME);
            }
            db = await this.getUpgradedDB(db);
        }
        db.onclose = (/* e: Event */) => {
            this.db = undefined;
            log.debug(`[DB] Db ${db.name} is closed.`);
        };
        db.onerror = (e: Event) => {
            this.db = undefined;
            log.debug(`[DB] Db ${db.name} encountered error.`, e);
        };
        db.onabort = (e: Event) => {
            this.db = undefined;
            log.debug(`[DB] Db ${db.name} aborted.`, e);
        };
        db.onversionchange = (e) => {
            log.debug("onversionchange", e);
        };
        this.db = db;
        // }
        return Promise.resolve(this.db);
    }

    /**
     * Closes the database.
     */
    public closeDatabase() {
        this.db && this.db.close();
    }

    private deleteDataBase(dbName: string) {
        return new Promise((resolve, reject) => {
            const request = window.indexedDB.deleteDatabase(dbName);
            request.onerror = (e) => {
                log.debug(e);
                reject(e);
            };
            request.onsuccess = (e: any) => { // eslint-disable-line
                const db = e.target;
                log.debug(`[DB] Db ${dbName} delete old version ${e.oldVersion}.`);
                resolve(db);
            };
        });
    }

    private async getDB(dbName: string): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = window.indexedDB.open(dbName);
            request.onerror = reject;
            request.onsuccess = (e: any) => { // eslint-disable-line
                const db = e.target.result;
                log.debug(`[DB] Db ${db.name} opened (version ${db.version}).`);
                resolve(db);
            };
        });
    }

    private async getUpgradedDB(db: IDBDatabase): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            log.debug(`[DB] Upgrading db ${db.name} (version ${db.version})`);
            const request = window.indexedDB.open(db.name, db.version + 1);
            request.onerror = reject;
            request.onblocked = (event) => {
                log.debug("onblocked", event);
            };
            request.onupgradeneeded = (e: any) => { // eslint-disable-line
                const transaction = e.target.transaction;
                transaction.oncomplete = () => {
                    // need to return until transaction is completed!
                    log.debug(`[DB] Upgrade is done (new version: ${db.version}).`);
                    // resolve(db);
                };
                const db = e.target.result;
                const promises: Promise<any>[] = []; // eslint-disable-line
                for (let i = 0; i < this.tables.length; ++i) {
                    const table = this.tables[i];
                    if (!db.objectStoreNames.contains(table.name)) {
                        log.debug(`[DB] Creating table ${table.name}...`);
                        const p = this.createTable(db, table.name, table.options, table.indexArray);
                        promises.push(p);
                    }
                }
                if (promises.length > 0) {
                    Promise.all(promises).then(() => {
                        log.debug(`[DB] All(${promises.length}) tables created.`);
                    });
                }
            };
            request.onsuccess = (e: any) => { // eslint-disable-line
                const db = e.target.result;
                log.debug(`[DB] Db ${db.name} opened (version ${db.version}).`);
                resolve(db);
            };
        });
    }

    private async createTable(
        db: IDBDatabase,
        tableName: string,
        options?: IDBObjectStoreParameters,
        indexArray?: { name: string; fields: string[]; unique: boolean }[]
    ) {
        return new Promise((resolve) => {
            const store = db.createObjectStore(tableName, options);
            indexArray &&
                indexArray.forEach((indexObj) => {
                    store.createIndex(indexObj.name, indexObj.fields, { unique: indexObj.unique });
                });
            // store.transaction.onerror = reject
            // store.transaction.oncomplete = (e: any) => {
            //   log.debug(`[DB] Table ${tableName} created.`)
            //   resolve(e.target.db)
            // }
            log.debug(`[DB] Table ${tableName} created.`);
            resolve(db);
        });
    }
}
