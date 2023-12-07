import * as THREE from "three";

import { BasePanoMesh } from "./BasePanoMesh";
import type { ImageManager } from "./ImageManager";

/**
 * A cube contains 6 planes
 * "r" | "l" | "u" | "d" | "f" | "b": means left, right, up, down, front, back
 * x, -x, y, -y, z, -z, aka, right, left, up/top, down/bottom, front, back
 */
export class PanoCube extends BasePanoMesh {
    constructor(manager: ImageManager, images: string[], thumbnailImages?: string[], size = 200) {
        super(manager, images, thumbnailImages, size);

        if (images.length !== 6) {
            throw new Error(`[Pano] Wrong number of images! Expected 6, got ${images.length}`);
        }
    }

    async create() {
        await this.createThumbnailMesh(this.size);
        this.thumbnailMesh ? this.updateMesh() : await this.createMesh();
        return;
    }

    private updateMesh() {
        const mesh = this.thumbnailMesh as THREE.Mesh;
        let thumbnailImagesLength = (this.thumbnailImages as string[]).length;
        this.images.forEach(async (url, index) => {
            const texture = await this.loadTexturesAsync([url], true);
            const material = mesh.material as THREE.MeshBasicMaterial[];
            material[index].map = texture[0];
            thumbnailImagesLength--;
            if (thumbnailImagesLength === 0) {
                this.thumbnailImages = undefined;
            }
            this.render?.();
        });
        this.destroyMesh(this.mesh as THREE.Mesh);
        this.mesh = undefined;
    }

    protected async createMesh() {
        const mesh = this.mesh as THREE.Mesh;
        mesh.geometry = new THREE.BoxGeometry(this.size, this.size, this.size);
        mesh.geometry.scale(1, 1, -1);

        const results = await this.loadTexturesAsync(this.images);
        const materials = results.map((texture) => new THREE.MeshBasicMaterial({ map: texture, side: THREE.FrontSide, transparent: true }));
        mesh.material = materials;
        this.add(mesh);

        if (this.thumbnailMesh) {
            this.destroyMesh(this.thumbnailMesh);
            this.thumbnailMesh = undefined;
            this.thumbnailImages = undefined;
        }
        this.render?.();
    }
}
