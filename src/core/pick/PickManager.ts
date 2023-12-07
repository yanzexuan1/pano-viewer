import * as THREE from "three";

import { CoordinateUtils } from "src/core/utils";
import type { BaseViewer } from "src/core/viewers";

export interface CpuIntersection {
    distance: number;
    /** The intersected object */
    object: THREE.Object3D;
    /** Point of intersection, in world coordinates */
    point: THREE.Vector3;
    face?: THREE.Face;
    // TODO: instance pick
    instanceId?: number;
}

export class PickManager {
    private viewer: BaseViewer;
    private raycaster: THREE.Raycaster;

    constructor(viewer: BaseViewer) {
        this.viewer = viewer;
        this.raycaster = new THREE.Raycaster();
    }

    get scene() {
        return this.viewer.scene as THREE.Scene;
    }

    get camera() {
        return this.viewer.camera as THREE.OrthographicCamera;
    }

    get renderer() {
        return this.viewer.renderer as THREE.WebGLRenderer;
    }

    get viewerContainer() {
        return this.viewer.viewerContainer as HTMLElement;
    }

    getRaycaster() {
        return this.raycaster;
    }

    /**
     * Picks the closest object by NDC coordinate.
     */
    pickObjectByNdc(ndcCoord: THREE.Vector2, objects: THREE.Object3D[], layerChannels?: number[]) {
        if (!objects) {
            return undefined;
        }
        // cast a ray through the frustum
        this.raycaster.setFromCamera(ndcCoord, this.camera);
        this.setLayerChannels(layerChannels);
        // get the list of objects the ray intersected
        const intersectedObjects = this.raycaster.intersectObjects(Array.isArray(objects) ? objects : [objects], true);
        if (intersectedObjects.length) {
            // pick the first object. It's the closest one
            const i = intersectedObjects[0];
            const object = i.object;
            const point = i.point;
            const distance = i.distance;
            const face = i.face || undefined;
            const instanceId = i.instanceId || undefined;
            return { object, point, distance, face, instanceId };
        }
        return undefined;
    }

    /**
     * Picks the closest object by mouse position.
     */
    pickObject(mousePosition: THREE.Vector2, objects: THREE.Object3D[], layerChannels?: number[]): CpuIntersection | undefined {
        const ndcCoord = CoordinateUtils.screen2Ndc(mousePosition, this.camera, this.viewerContainer);
        return this.pickObjectByNdc(ndcCoord, objects, layerChannels);
    }

    /**
     * Sets raycaster's layer channels.
     */
    private setLayerChannels(channels?: number[]) {
        if (channels && channels.length > 0) {
            this.raycaster.layers.disableAll();
            channels.forEach((layer: number) => {
                this.raycaster.layers.enable(layer);
            });
        } else {
            this.raycaster.layers.enableAll();
        }
    }
}
