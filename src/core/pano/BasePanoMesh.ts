import _ from "lodash";
import * as THREE from "three";

import type { ImageManager } from "./ImageManager";

/**
 * The base class of vr mesh.
 */
export class BasePanoMesh extends THREE.Group {
    protected textureLoader = new THREE.TextureLoader();
    protected imageManager: ImageManager;
    protected images: string[];
    protected mesh?: THREE.Object3D; // the box that attaches images
    protected thumbnailImages?: string[];
    protected thumbnailMesh?: THREE.Mesh; // the box that attaches thumbnail images
    protected size: number;
    private fadingInInterval?: NodeJS.Timeout;
    private fadingOutInterval?: NodeJS.Timeout;

    render?: () => void;
    private enableCache = false;

    constructor(imgMgr: ImageManager, images: string[], thumbnailImages?: string[], size = 10) {
        super();

        this.imageManager = imgMgr;

        this.images = images;
        this.thumbnailImages = thumbnailImages;
        this.size = size;

        this.mesh = new THREE.Mesh(); // Variables must be initialized in the constructor
    }

    /**
     * Fades in by changing its opacity
     */
    fadeIn(durationInMs = 1000) {
        const INTERVAL = 10; // ms
        let materials = this.getMaterials();
        if (Array.isArray(materials) && materials.length > 0) {
            materials.forEach((m) => (m.opacity = 0));
        } else {
            // no material, just make it visible and return
            this.visible = true;
            return;
        }
        const delta = 1 / (durationInMs / INTERVAL);
        this.visible = true;

        this.clearFading(); // just in case there is existing fading interval, stop it
        this.renderOrder = Infinity;
        this.fadingInInterval = setInterval(() => {
            let opacity = 1;
            const newMaterials = this.getMaterials();
            if (!this.materialsEqual(materials, newMaterials)) {
                materials = newMaterials;
            }
            if (materials.length > 0) {
                opacity = Math.min(materials[0].opacity + delta, 1);
                materials.forEach((m) => (m.opacity = opacity));
            }
            if (opacity >= 1) {
                this.clearFading();
            }
            this.render?.();
        }, INTERVAL);
    }

    protected materialsEqual(mat1: THREE.Material | THREE.Material[], mat2: THREE.Material | THREE.Material[]) {
        return _.isEqualWith(mat1, mat2, (m1, m2) => {
            if (Array.isArray(m1) && Array.isArray(m2)) {
                return;
            }
            return m1.id === m2.id;
        });
    }

    /**
     * Fades out by changing its opacity.
     * In the meantime, will dynamically change its scale. We do this because there is
     * bug in threejs that when two or more pictures are transparent, it may render improperly!
     */
    fadeOut(durationInMs = 1000) {
        const INTERVAL = 10; // ms
        const materials = this.getMaterials();
        const colorDelta = 1 / (durationInMs / INTERVAL);

        const startScale = 2; // make the box larger first to avoid overlapping with another box
        const endScale = 3;
        const scaleDelta = (endScale - startScale) / (durationInMs / INTERVAL);

        this.clearFading(); // just in case there is existing fading interval, stop it
        this.scale.set(startScale, startScale, startScale);
        this.renderOrder = 0;
        this.fadingOutInterval = setInterval(() => {
            const scale = this.scale.x + scaleDelta;
            this.scale.set(scale, scale, scale);

            let opacity = 0;
            if (materials.length > 0) {
                opacity = Math.max(materials[0].opacity - colorDelta, 0);
                materials.forEach((m) => (m.opacity = opacity));
            }
            if (opacity <= 0 || scale >= endScale) {
                this.clearFading();
                this.enableCache && this.destroy();
            }
            this.render?.();
        }, INTERVAL);
    }

    /**
     * Clears existing fadeIn/fadeOut intervals if any
     */
    private clearFading() {
        const materials = this.getMaterials();

        if (this.fadingInInterval) {
            clearInterval(this.fadingInInterval);
            this.fadingInInterval = undefined;
            this.visible = true; // display it directly without fading any longer
            materials.forEach((mat) => (mat.opacity = 1)); // revert opacity to 1
        }

        if (this.fadingOutInterval) {
            clearInterval(this.fadingOutInterval);
            this.fadingOutInterval = undefined;
            this.visible = false; // hide it directly without fading any longer
            materials.forEach((mat) => (mat.opacity = 1)); // revert opacity to 1
            this.scale.set(1, 1, 1);
        }
    }

    protected getMaterials() {
        let mesh = this.thumbnailMesh as THREE.Mesh;
        if (!mesh) {
            mesh = this.mesh as THREE.Mesh;
        }
        const materials = [];
        if (Array.isArray(mesh.material)) {
            materials.push(...mesh.material);
        } else if (mesh.material) {
            materials.push(mesh.material);
        }
        return materials;
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    protected create() {}

    protected async createThumbnailMesh(size: number) {
        if (!this.thumbnailImages || this.thumbnailImages.length != 6) {
            return;
        }

        this.thumbnailMesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size));
        this.thumbnailMesh.geometry.scale(1, 1, -1);

        const textures = await this.loadTexturesAsync(this.thumbnailImages, false);
        const materials = textures.map((texture) => new THREE.MeshBasicMaterial({ map: texture, side: THREE.FrontSide, transparent: true }));

        if (this.thumbnailMesh) {
            // Considers that it may have been removed asynchronously
            this.thumbnailMesh.material = materials;
            this.add(this.thumbnailMesh);
        }
    }

    protected async loadTexturesAsync(images: string[], isCache = true) {
        return Promise.all(
            images.map(async (url) => {
                let texture;
                if (isCache) {
                    const image = await this.imageManager.get(url);
                    texture = new THREE.Texture(image);
                    texture.needsUpdate = true;
                } else {
                    texture = await this.textureLoader.loadAsync(url);
                }
                texture.colorSpace = THREE.SRGBColorSpace;
                return texture;
            })
        );
    }

    setCacheEnabled(enable: boolean) {
        this.enableCache = enable;
    }

    destroyMesh(mesh: THREE.Mesh) {
        this.remove(mesh);
        mesh.clear();
        mesh.geometry.dispose();
        if (!Array.isArray(mesh.material)) {
            (mesh.material as THREE.MeshBasicMaterial).map?.dispose();
            mesh.material.dispose();
        } else {
            mesh.material.forEach((m) => {
                (m as THREE.MeshBasicMaterial).map?.dispose();
                m.dispose();
            });
        }
    }

    destroy() {
        this.clearFading();
        this.images = [];
        this.thumbnailImages = undefined;
        this.removeFromParent();

        if (this.thumbnailMesh) {
            this.destroyMesh(this.thumbnailMesh);
            this.thumbnailMesh = undefined;
        }

        if (!this.mesh) {
            return;
        }
        if (this.mesh instanceof THREE.Mesh) {
            this.destroyMesh(this.mesh);
        } else {
            this.mesh.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    this.destroyMesh(child);
                }
            });
        }
        this.mesh = undefined;
    }
}
