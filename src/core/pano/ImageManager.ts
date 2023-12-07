import * as THREE from "three";

import { ImageDataTable, ImageDataTableRecord } from "src/core/indexeddb";

export class ImageManager {
    private loader: THREE.ImageLoader;

    enableCache = true;

    constructor() {
        this.loader = new THREE.ImageLoader();
    }

    private async setImageToInedxdb(record: ImageDataTableRecord) {
        try {
            await ImageDataTable.instance().save(record);
            console.log(`[Pano] Saved '${record.fileName}' to indexedDb`);
        } catch (error) {
            console.log(`[Pano] Failed to save '${record.fileName}' to indexedDb! ${error}`);
        }
    }

    private async getImageFromIndexdb(fileName: string): Promise<HTMLImageElement | null> {
        const image = await ImageDataTable.instance().query(fileName);
        if (!image) {
            return null;
        }
        const blob = image.data;
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.src = url;
        return await new Promise((resolve) => {
            img.onload = () => {
                resolve(img);
            };
        });
    }

    private async removeImageFromIndexdb(fileName: string) {
        await ImageDataTable.instance().delete(fileName);
    }

    private async clearImageFromIndexdb() {
        await ImageDataTable.instance().clearAll();
    }

    private saveImageData(url: string, image: HTMLImageElement): Promise<Blob | null> {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d") as CanvasRenderingContext2D;
        canvas.width = image.width;
        canvas.height = image.height;
        context.drawImage(image, 0, 0);
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                const record = { fileName: url, data: blob as Blob };
                this.setImageToInedxdb(record);
                resolve(blob);
            });
        });
    }

    async get(url: string) {
        let image;
        if (this.enableCache) {
            image = await this.getImageFromIndexdb(url);
            if (!image) {
                image = await this.loader.loadAsync(url);
                this.saveImageData(url, image as HTMLImageElement);
            }
        } else {
            image = await this.loader.loadAsync(url);
        }
        return image;
    }

    async remove(url: string) {
        await this.removeImageFromIndexdb(url);
    }

    async clear() {
        await this.clearImageFromIndexdb();
    }

    public static getFileName(url: string) {
        const index = url.lastIndexOf("/");
        const fileName = url.substring(index + 1);
        return fileName;
    }

    destroy() {
        this.clear();
    }
}
