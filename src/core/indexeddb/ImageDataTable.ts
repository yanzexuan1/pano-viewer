import { BaseTable } from "./BaseTable";

export interface ImageDataTableRecord {
    fileName: string;
    data: Blob; // eslint-disable-line
}
/**
 * ImageDataTable in IndexedDb
 * Table is known as ObjectStore in IndexedDb
 */
export class ImageDataTable extends BaseTable {
    public tableName() {
        return "images";
    }

    /**
     * Singleton design pattern
     */
    private static _instance: ImageDataTable | undefined = undefined;
    public static instance(): ImageDataTable {
        if (!ImageDataTable._instance) {
            ImageDataTable._instance = new ImageDataTable();
        }
        return ImageDataTable._instance;
    }

    /**
     * Queires a image data
     * @param fileId should be a unique id to identify different image files
     */
    query(fileName: string): Promise<ImageDataTableRecord> {
        let records: ImageDataTableRecord;
        return new Promise((resolve, reject) => {
            super.query(
                (cursor: any) => { // eslint-disable-line
                    if (!cursor) {
                        resolve(records);
                        return; // end of iteration
                    }
                    if (!cursor.value || cursor.value.fileName !== fileName) {
                        return; // filter out unexpected
                    }
                    // indexedDb put the 'key' into value automatically, so we don't need to store cursor.key any more.
                    records = cursor.value;
                },
                (error: any) => { // eslint-disable-line
                    reject(error);
                }
            );
        });
    }

    async queryAll(): Promise<ImageDataTableRecord[]> {
        return new Promise((resolve, reject) => {
            super.queryAll(
                (records: any) => { // eslint-disable-line
                    resolve(records as ImageDataTableRecord[]);
                },
                (error: any) => { // eslint-disable-line
                    reject(error);
                }
            );
        });
    }
}
