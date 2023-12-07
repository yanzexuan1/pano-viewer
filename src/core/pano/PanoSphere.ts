import * as THREE from "three";

import { BasePanoMesh } from "./BasePanoMesh";
import type { ImageManager } from "./ImageManager";

/**
 * A sphere that maps the one image. More than one may be included later.
 */
export class PanoSphere extends BasePanoMesh {
    constructor(manager: ImageManager, images: string[], thumbnailImages?: string[], size = 100) {
        super(manager, images, thumbnailImages, size);

        if (images.length !== 1) {
            throw new Error(`[Pano] Wrong number of images! Expected 1, got ${images.length}`);
        }
    }

    async create() {
        await this.createThumbnailMesh(this.size + 0.1);
        this.thumbnailMesh ? this.createMesh() : await this.createMesh();
        return;
    }

    protected async createMesh() {
        const mesh = this.mesh as THREE.Mesh;

        const SEGMENTS = 100;
        mesh.geometry = new THREE.SphereGeometry(this.size, SEGMENTS, SEGMENTS);
        mesh.geometry.scale(-1, 1, 1); // swap left and right side

        const results = await this.loadTexturesAsync(this.images);
        const materials = results.map((texture) => new THREE.MeshBasicMaterial({ map: texture, side: THREE.FrontSide, transparent: true }));
        mesh.material = materials[0]; // only one texture
        this.add(mesh);

        if (this.thumbnailMesh) {
            this.destroyMesh(this.thumbnailMesh);
            this.remove(this.thumbnailMesh);
            this.thumbnailMesh?.clear();
            this.thumbnailMesh = undefined;
        }
        this.render?.();
    }
}
