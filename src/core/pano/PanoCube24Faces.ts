import * as THREE from "three";

import { BasePanoMesh } from "./BasePanoMesh";
import type { ImageManager } from "./ImageManager";

/**
 * A cube contains 6 planes, each plane contains 4 sub-planes as bellow:
 * ratio, 1 : 1
 *    width0 : width1
 *  ______________________
 * |           |          |
 * | 1024x1024 |          |
 * |  _1_1.jpg | _1_2.jpg |
 * |___________|__________|
 * |           |          |
 * |           |          |
 * |  _2_1.jpg | _2_2.jpg |
 * |___________|__________|
 *
 * ratio, 4 : 1
 *    width0 : width1
 *  ________________
 * |           |    |
 * | 1024x1024 |    |
 * |  _1_1.jpg |    | _1_2.jpg
 * |___________|____|
 * |           |    | 256x256
 * |___________|____| _2_2.jpg
 *   _2_1.jpg
 *
 * An example of image name is l1_b_1_2.jpg
 * l: level;
 * "r" | "l" | "u" | "d" | "f" | "b": means left, right, up, down, front, back
 * x, -x, y, -y, z, -z, aka, right, left, up/top, down/bottom, front, back
 */
export class PanoCube24Faces extends BasePanoMesh {
    private ratio: number; // sub plane width vs. another
    private subPlaneWidth0: number;
    private subPlaneWidth1: number;

    /**
     * @param images must be in order of right, left, up/top, down/bottom, front, back
     * And the 4 images for each side, must be in order of 1_1, 1_2, 2_1, 2_2.
     */
    constructor(manager: ImageManager, images: string[], thumbnailImages?: string[], size = 200) {
        super(manager, images, thumbnailImages, size);

        if (images.length !== 24) {
            throw new Error(`[Pano] Wrong number of images! Expected 24, got ${images.length}`);
        }

        this.ratio = 1 / 1;
        this.subPlaneWidth0 = this.size * (this.ratio / (this.ratio + 1));
        this.subPlaneWidth1 = this.size - this.subPlaneWidth0;
    }

    async create() {
        await this.createThumbnailMesh(this.size + 0.1);
        this.thumbnailMesh ? this.createMesh() : await this.createMesh();
        return;
    }

    protected async createMesh() {
        this.mesh = new THREE.Group();
        this.mesh.scale.set(1, 1, -1);

        const results = await this.loadTexturesAsync(this.images);
        const materials = results.map((texture) => new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide, transparent: true }));
        if (materials.length !== 24) {
            throw new Error(`[Pano] Wrong number of materials! Expected 24, got ${materials.length}`);
        }
        const intervalCount = 4;
        // need to keep the creation in order of right, left, up/top, down/bottom, front, back
        const right = this.createPlaneOfAFace(materials.slice(0, intervalCount));
        right.rotateOnAxis(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
        right.position.set(this.size / 2, 0, 0);

        const left = this.createPlaneOfAFace(materials.slice(intervalCount, intervalCount * 2));
        left.rotateOnAxis(new THREE.Vector3(0, 1, 0), Math.PI / 2);
        left.position.set(-this.size / 2, 0, 0);

        const up = this.createPlaneOfAFace(materials.slice(intervalCount * 2, intervalCount * 3));
        up.rotateOnAxis(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
        up.rotateOnAxis(new THREE.Vector3(0, 0, 1), Math.PI);
        up.rotateOnAxis(new THREE.Vector3(1, 0, 0), Math.PI);
        up.position.set(0, this.size / 2, 0);

        const down = this.createPlaneOfAFace(materials.slice(intervalCount * 3, intervalCount * 4));
        down.rotateOnAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2);
        down.rotateOnAxis(new THREE.Vector3(0, 0, 1), Math.PI);
        down.rotateOnAxis(new THREE.Vector3(1, 0, 0), Math.PI);
        down.position.set(0, -this.size / 2, 0);

        const front = this.createPlaneOfAFace(materials.slice(intervalCount * 4, intervalCount * 5));
        front.rotateOnAxis(new THREE.Vector3(0, 1, 0), Math.PI);
        front.position.set(0, 0, this.size / 2);

        const back = this.createPlaneOfAFace(materials.slice(intervalCount * 5, intervalCount * 6));
        back.position.set(0, 0, -this.size / 2);

        this.add(this.mesh);
        this.mesh?.updateMatrix();
        this.mesh?.updateMatrixWorld(true);

        if (this.thumbnailMesh) {
            this.destroyMesh(this.thumbnailMesh);
            this.remove(this.thumbnailMesh);
            this.thumbnailMesh?.clear();
            this.thumbnailMesh = undefined;
        }

        this.render?.();
    }

    private createPlaneOfAFace(materials: THREE.MeshBasicMaterial[]): THREE.Group {
        const group = new THREE.Group();
        const geom11 = new THREE.PlaneGeometry(this.subPlaneWidth0, this.subPlaneWidth0);
        const geom12 = new THREE.PlaneGeometry(this.subPlaneWidth1, this.subPlaneWidth0);
        const geom21 = new THREE.PlaneGeometry(this.subPlaneWidth0, this.subPlaneWidth1);
        const geom22 = new THREE.PlaneGeometry(this.subPlaneWidth1, this.subPlaneWidth1);
        const mesh11 = new THREE.Mesh(geom11, materials[0]);
        const mesh12 = new THREE.Mesh(geom12, materials[1]);
        const mesh21 = new THREE.Mesh(geom21, materials[2]);
        const mesh22 = new THREE.Mesh(geom22, materials[3]);
        mesh11.position.set(this.subPlaneWidth1 / 2, this.subPlaneWidth1 / 2, 0);
        mesh12.position.set(-this.subPlaneWidth0 / 2, this.subPlaneWidth1 / 2, 0);
        mesh21.position.set(this.subPlaneWidth1 / 2, -this.subPlaneWidth0 / 2, 0);
        mesh22.position.set(-this.subPlaneWidth0 / 2, -this.subPlaneWidth0 / 2, 0);
        mesh11.geometry.scale(-1, 1, 1); // swap left and right side
        mesh12.geometry.scale(-1, 1, 1);
        mesh21.geometry.scale(-1, 1, 1);
        mesh22.geometry.scale(-1, 1, 1);
        group.add(mesh11, mesh12, mesh21, mesh22);
        this.mesh?.add(group);
        return group;
    }
}
