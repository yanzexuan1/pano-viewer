import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";

import { ViewerName } from "./Constants";
import { Hotpoint, Panorama, PanoViewerConfig, PanoViewpoint as PanoViewpoint } from "src/core/Configs";
import { CameraProjection } from "src/core/camera";
import { ControlsMode } from "src/core/controls/Control";
import { BasePanoMesh } from "src/core/pano/BasePanoMesh";
import { ImageManager } from "src/core/pano/ImageManager";
import { PanoCube } from "src/core/pano/PanoCube";
import { PanoCube24Faces } from "src/core/pano/PanoCube24Faces";
import { PanoSphere } from "src/core/pano/PanoSphere";
import { log, CSS2DObjectUtils, CommonUtils } from "src/core/utils";
import { BaseViewer } from "src/core/viewers/BaseViewer";
import { ViewerEvent } from "src/core/viewers/ViewerEvent";

/**
 * Panorama viewer.
 */
export class PanoViewer extends BaseViewer {
    /**
     * @internal
     */
    name = ViewerName.PanoViewer;

    private viewpoints: PanoViewpoint[] = [];
    private imageManager: ImageManager;
    private activeViewpointId = "undefined";
    private activePanoramaId = "undefined";
    private enableCache: boolean;
    private autoRotateSpeed = 2.0;
    private autoRotate = true;
    private enableAutoRotate = true;
    private delayAutoRotateTimeout?: NodeJS.Timeout;

    constructor(viewerCfg: PanoViewerConfig) {
        super(viewerCfg);

        this.enableCache = viewerCfg.enableCache || false;

        this.sceneManager.enableClipping(false);

        this.cameraManager.setProjection(CameraProjection.Perspective);
        this.cameraManager.setNavigationMode(ControlsMode.Panorama);

        (this.camera as THREE.PerspectiveCamera).fov = 75;
        (this.camera as THREE.PerspectiveCamera).updateProjectionMatrix();

        this.imageManager = new ImageManager();
        this.imageManager.enableCache = this.enableCache;

        this.setDefaultBackground();
        this.setupDefaultEvents();
        this.setupAutoRotateEvents();

        if (this.enableAutoRotate) {
            this.delayAutoRotate(); // delay for several seconds
        }
    }

    private setDefaultBackground() {
        this.setBackgroundColor(1, 1, 1);
    }

    private setupDefaultEvents() {
        let mouseMoved = false;
        let mouseDownPositionX = -1; // -1 means invalid point
        let mouseDownPositionY = -1;
        this.inputManager.addEventListener("keydown", () => {
            this.delayAutoRotate();
        });
        this.inputManager.addEventListener("pointerdown", (e) => {
            mouseDownPositionX = e.x;
            mouseDownPositionY = e.y;
            mouseMoved = false;
            if (this.autoRotate) {
                this.delayAutoRotate();
            }
            const button = e.button as unknown as THREE.MOUSE;
            if (button === THREE.MOUSE.LEFT && e.originalEvent?.target instanceof HTMLCanvasElement) {
                this.renderer.domElement.style.cursor = "move";
            }
        });
        this.inputManager.addEventListener("pointermove", (e) => {
            if (mouseDownPositionX >= 0 && mouseDownPositionY >= 0) {
                // if pointerdown just happened, and there is really a movement, then mouseMoved is true
                const TOLERANCE = 5;
                if (Math.abs(e.x - mouseDownPositionX) > TOLERANCE || Math.abs(e.y - mouseDownPositionY) > TOLERANCE) {
                    mouseMoved = true;
                }
            }
        });
        this.inputManager.addEventListener("pointerup", (e) => {
            if (this.autoRotate) {
                this.delayAutoRotate();
            }
            this.renderer.domElement.style.cursor = "auto";
            const button = e.button as unknown as THREE.MOUSE;
            if (mouseMoved || button !== THREE.MOUSE.LEFT) {
                return;
            }
            if (e.originalEvent?.target && e.originalEvent.target instanceof HTMLElement) {
                const id = CSS2DObjectUtils.tryFindObjectId(e.originalEvent.target);
                if (id) {
                    const object = this.scene?.getObjectById(id);
                    if (object) {
                        this.dispatchEvent(ViewerEvent.HotpointClick, object.userData.hotpoint);
                    }
                } else {
                    const position = this.getHitResult(e);
                    if (position) {
                        const d = position.clone().sub(this.camera.position).normalize();
                        log.info(`[Viewer] Clicked at: ${CommonUtils.vectorToString(position)},
                            Camera position: ${CommonUtils.vectorToString(this.camera.position)},
                            Target direction: ${CommonUtils.vectorToString(d)}`);
                    }
                }
            }
        });
    }

    private setupAutoRotateEvents() {
        const controls = this.cameraManager.cameraControls;
        // Auto rotate
        this.addEventListener(ViewerEvent.OnAnimate, () => {
            if (this.autoRotate && this.enableAutoRotate) {
                controls.azimuthAngle -= ((2 * Math.PI) / 60 / 60) * this.autoRotateSpeed;
            }
        });
    }

    private delayAutoRotate() {
        clearInterval(this.delayAutoRotateTimeout);
        this.autoRotate = false;
        this.delayAutoRotateTimeout = setTimeout(() => {
            this.autoRotate = true;
        }, 5000);
    }

    /**
     * Gets if selection is enabled.
     */
    get enableSelection() {
        log.warn("[Viewer] enableSelection is not implemented yet!");
        return false;
    }

    /**
     * Sets if selection is enabled.
     */
    set enableSelection(enable: boolean) {
        log.warn("[Viewer] enableSelection is not implemented yet!");
    }

    /**
     * Creates box by 1, 6 or 24 images.
     * For 6/24 images, caller must make sure the order is correct. The reason is that,
     * the url can be really complex that we cannot order them here!
     * 6 images must be in order of: right, left, top, bottom, front, back
     * 24 images must be in order of: 4 for right(1_1, 1_2, 2_1, 2_2), 4 for left, top, bottom, front, back...
     */
    private async createBoxByImageOrImages(viewpoint: PanoViewpoint, panoramaId: string) {
        let images = viewpoint.imageOrImages;
        let thumbnails = viewpoint.thumbnailImages;

        if (viewpoint.panoramas?.length > 0) {
            let pano = this.findPanorama(viewpoint.id, panoramaId);
            if (!pano) {
                pano = viewpoint.panoramas[0];
                log.warn(`[Viewer] Failed to find panorama by id '${panoramaId}', will use the first one`);
            }
            images = pano.images;
            thumbnails = pano.thumbnails;
            panoramaId = pano.id;
        }
        if (!images) {
            throw new Error("[Viewer] Invalid images!");
        }
        if (!Array.isArray(images)) {
            images = [images];
        }

        if (images.length === 1) {
            return this.createBoxByImage(images, thumbnails);
        } else if (images.length === 6) {
            return this.createBoxBy6Images(images, thumbnails);
        } else if (images.length === 24) {
            return this.createBoxBy24Images(images, thumbnails);
        } else {
            throw new Error(`[Viewer] Wrong number of images! Expected 1/6/24, got ${images.length}`);
        }
    }

    private setVrMeshDefault(vrMesh: BasePanoMesh) {
        vrMesh.setCacheEnabled(this.enableCache);
    }

    /**
     * Creates a box with proper size and texture from an image.
     */
    private async createBoxByImage(images: string[], thumbnails: string[] | undefined) {
        const object = new PanoSphere(this.imageManager, images, thumbnails);
        this.setVrMeshDefault(object);
        await object.create();
        return object;
    }

    /**
     * Creates a box with proper size and texture from 6 images.
     */
    private async createBoxBy6Images(images: string[], thumbnails: string[] | undefined) {
        if (images.length !== 6) {
            throw new Error(`[Viewer] Wrong number of images! Expected 6, got ${images.length}`);
        }
        const object = new PanoCube(this.imageManager, images, thumbnails);
        this.setVrMeshDefault(object);
        await object.create();
        return object;
    }

    private async createBoxBy24Images(images: string[], thumbnails: string[] | undefined) {
        if (images.length !== 24) {
            throw new Error(`[Viewer] Wrong number of images! Expected 24, got ${images.length}`);
        }
        // TODO: support onSuccess/onError for PanoCube
        const object = new PanoCube24Faces(this.imageManager, images, thumbnails);
        this.setVrMeshDefault(object);
        await object.create();
        return object;
    }

    private adjustCamera(viewpoint: PanoViewpoint, setCameraToInitialDirection: boolean) {
        // If viewpoint.position is not assigned, use (0, 0, 0).
        // We shouldn't keep position unchanged, that may cause other issues.
        const cameraPos = new THREE.Vector3(0, 0, 0);
        // if viewpoint.initialDirection is not assigned, will keep camera direction unchanged
        const cameraDir = new THREE.Vector3(1, 0, 0);
        const direction = this.getCameraDirection();
        if (direction) {
            cameraDir.set(direction.x, direction.y, direction.z);
        }
        // if there is a position for viewpoint, move box center and camera to there
        const p = viewpoint.position;
        if (p && p.length === 3) {
            cameraPos.set(p[0], p[1], p[2]);
        }
        if (setCameraToInitialDirection) {
            const d = viewpoint.initialDirection;
            if (d && d.length === 3) {
                cameraDir.set(d[0], d[1], d[2]);
            }
        }
        this.setCameraPositionAndDirection(cameraPos.toArray(), cameraDir.toArray());
    }

    private setCss2dObjectsVisible(group: THREE.Group, visible: boolean) {
        group.traverse((child) => {
            if (child instanceof CSS2DObject) {
                child.visible = visible;
            }
        });
    }

    private relocateAnchorIfTooCloseToCamera(object: CSS2DObject, anchorPosition: THREE.Vector3, viewPosition: THREE.Vector3) {
        const camera = this.camera as THREE.PerspectiveCamera;
        if (!camera) {
            log.error("[Viewer] Camera is not initialized");
            object.position.set(anchorPosition.x, anchorPosition.y, anchorPosition.z);
            return;
        }

        let position: THREE.Vector3;
        const distance = Math.abs(anchorPosition.distanceTo(viewPosition));
        if (distance < camera.near) {
            const direction = anchorPosition.clone().sub(viewPosition).normalize();
            position = viewPosition.clone().add(direction.multiplyScalar(distance + 1));
        } else {
            position = anchorPosition;
        }
        object.position.set(position.x, position.y, position.z);
    }

    /**
     * Gets a group of viewpoints
     */
    getViewpoint(id: string): PanoViewpoint | undefined {
        return this.viewpoints.find((item) => item.id === id);
    }

    /**
     * Sets a group of viewpoints
     */
    setViewpoints(viewpoints: PanoViewpoint[]) {
        this.viewpoints.forEach((vp) => {
            const group = this.scene.getObjectByName(vp.id);
            vp.panoramas?.forEach((pano) => {
                const panorama = group?.getObjectByName(pano.id) as BasePanoMesh;
                panorama?.destroy();
                this.removeImageCache(pano.images);
            });
            group?.clear();
            group?.removeFromParent();
            if (vp.imageOrImages) {
                this.removeImageCache(vp.imageOrImages);
            }
        });
        this.activeViewpointId = "undefined";
        this.activePanoramaId = "undefined";
        this.viewpoints = viewpoints;
    }

    /**
     * Activates a panorama by viewpointId and panoramaId
     */
    async activatePanoramaById(viewpointId: string, panoramaId: string, setCameraToInitialDirection = true) {
        if (viewpointId === this.activeViewpointId && panoramaId === this.activePanoramaId) {
            return;
        }
        const vp = this.getViewpoint(viewpointId);
        if (!vp) {
            return;
        }
        await this.activatePanorama(vp, panoramaId, setCameraToInitialDirection);
    }

    private async activatePanorama(viewpoint: PanoViewpoint, panoramaId: string, setCameraToInitialDirection = true) {
        const prevGroup = this.scene.getObjectByName(this.activeViewpointId);
        let currentGroup = this.scene.getObjectByName(viewpoint.id);

        const prevPanorama = prevGroup?.getObjectByName(this.activePanoramaId) as BasePanoMesh;
        if (prevPanorama) {
            const prevCss2dObjects = prevGroup?.getObjectByName("hotpoints");
            this.setCss2dObjectsVisible(prevCss2dObjects as THREE.Group, false);
            prevPanorama.fadeOut(1000);
        }

        const currentPanorama = currentGroup?.getObjectByName(panoramaId) as BasePanoMesh;
        const currentCss2dObjects = currentGroup?.getObjectByName("hotpoints");

        this.activeViewpointId = viewpoint.id;
        this.activePanoramaId = panoramaId;

        if (currentPanorama) {
            currentPanorama?.fadeIn(500);
            this.setCss2dObjectsVisible(currentCss2dObjects as THREE.Group, true);
            this.adjustCamera(viewpoint, setCameraToInitialDirection);
            return;
        }

        if (!currentGroup) {
            currentGroup = new THREE.Group();
            currentGroup.name = viewpoint.id;
            this.scene.add(currentGroup);
        }

        const vrMesh = await this.createBoxByImageOrImages(viewpoint, panoramaId);
        if (this.activeViewpointId !== viewpoint.id || this.activePanoramaId !== panoramaId) {
            vrMesh.destroy();
            return;
        }
        vrMesh.name = panoramaId;

        const p = viewpoint.position;
        if (p && p.length === 3) {
            vrMesh.position.set(p[0], p[1], p[2]);
        }

        vrMesh.fadeIn(500);
        this.adjustCamera(viewpoint, setCameraToInitialDirection);
        currentGroup.add(vrMesh);

        if (!viewpoint.hotpoints) {
            return;
        }

        let hotpointGroup = currentGroup.getObjectByName("hotpoints");
        if (!hotpointGroup) {
            hotpointGroup = new THREE.Group();
            hotpointGroup.name = "hotpoints";
        }

        if (hotpointGroup.children.length !== 0) {
            this.setCss2dObjectsVisible(currentCss2dObjects as THREE.Group, true);
            return;
        }

        viewpoint.hotpoints.forEach((hotpoint) => {
            const p = hotpoint.anchorPosition;
            const object = CSS2DObjectUtils.createHotpoint(hotpoint.html);
            object.visible = hotpoint.visible !== false;
            object.userData.hotpoint = hotpoint;
            const anchorPosition = new THREE.Vector3(p[0], p[1], p[2]);
            this.relocateAnchorIfTooCloseToCamera(object, anchorPosition, vrMesh.position);
            object.name = hotpoint.hotpointId;
            hotpointGroup?.add(object as unknown as THREE.Object3D);
            object.updateMatrix();
            object.updateMatrixWorld(true);
        });
        currentGroup.add(hotpointGroup);
    }

    /**
     * Adds a panorama to a viewpoint
     */
    addPanorama(viewpointId: string, panorama: Panorama) {
        const vp = this.viewpoints.find((vp) => vp.id === viewpointId);
        if (!vp) {
            throw new Error(`[Viewer] Failed to find viewpoint by id '${viewpointId}'`);
        }

        if (!vp.panoramas) {
            vp.panoramas = [];
        }
        // while, simply add it without checking duplicated id!
        vp.panoramas.push(panorama);
    }

    /**
     * Checks if a panorama exists in a viewpoint
     */
    findPanorama(viewpointId: string, panoramaId: string): Panorama | undefined {
        const vp = this.viewpoints.find((vp) => vp.id === viewpointId);
        if (vp && vp.panoramas) {
            return vp.panoramas.find((pano) => pano.id === panoramaId);
        }
        return undefined;
    }

    addHotpoints(hotpoints: Hotpoint[]) {
        if (!this.activeViewpointId || !hotpoints) {
            return;
        }

        const viewpoint = this.viewpoints.find((vp) => vp.id === this.activeViewpointId);
        const group = this.scene.getObjectByName(this.activeViewpointId);
        if (!viewpoint || !group) {
            return;
        }

        if (!viewpoint.hotpoints) {
            viewpoint.hotpoints = [];
        }

        let hotpointGroup = group.getObjectByName("hotpoints");
        if (hotpointGroup) {
            hotpointGroup = new THREE.Group();
            hotpointGroup.name = "hotpoints";
        }

        hotpoints.forEach((hotpoint) => {
            if (viewpoint.hotpoints?.findIndex((hp) => hp.hotpointId === hotpoint.hotpointId) !== -1) {
                log.warn(`[Viewer] Duplicated hotpointId: ${hotpoint.hotpointId}`);
                return;
            }
            const viewPointPosition = viewpoint.position || [0, 0, 0];
            const p = hotpoint.anchorPosition;
            const object = CSS2DObjectUtils.createHotpoint(hotpoint.html);
            const anchorPosition = new THREE.Vector3(p[0], p[1], p[2]);
            const viewPosition = new THREE.Vector3(viewPointPosition[0], viewPointPosition[1], viewPointPosition[2]);
            this.relocateAnchorIfTooCloseToCamera(object, anchorPosition, viewPosition);
            object.visible = hotpoint.visible !== false;
            object.userData.hotpoint = hotpoint;
            object.name = hotpoint.hotpointId;
            hotpointGroup?.add(object as unknown as THREE.Object3D);
            viewpoint.hotpoints.push(hotpoint);
        });
    }

    removeHotpoints(hotpointIds: string[]) {
        if (!this.activeViewpointId || !hotpointIds) {
            return;
        }

        const viewpoint = this.viewpoints.find((vp) => vp.id === this.activeViewpointId);
        const group = this.scene.getObjectByName(this.activeViewpointId);
        if (!viewpoint || !group) {
            return;
        }

        hotpointIds.forEach((hotpointId) => {
            if (viewpoint.hotpoints) {
                for (let i = viewpoint.hotpoints.length - 1; i >= 0; --i) {
                    if (hotpointId === viewpoint.hotpoints[i].hotpointId) {
                        viewpoint.hotpoints.splice(i, 1);
                    }
                }
            }
            const hotpointGroup = group.getObjectByName("hotpoints");
            const hotpoint = hotpointGroup?.getObjectByName(hotpointId);
            hotpoint?.removeFromParent();
        });
    }

    setHotpointsVisibility(visible: boolean, viewpointId = "", hotpointIds: string[] = []) {
        if (viewpointId) {
            const group = this.scene.getObjectByName(viewpointId);
            const hotpointGroup = group?.getObjectByName("hotpoints");
            hotpointIds.forEach((hotpointId) => {
                const hotpoint = hotpointGroup?.getObjectByName(hotpointId);
                if (hotpoint) {
                    hotpoint.visible = visible;
                }
            });
        } else {
            this.viewpoints.forEach((vp) => {
                const group = this.scene.getObjectByName(vp.id);
                const hotpointGroup = group?.getObjectByName("hotpoints");
                if (hotpointGroup) {
                    this.setCss2dObjectsVisible(hotpointGroup as THREE.Group, visible);
                }
            });
        }
    }

    async clearImageCache() {
        await this.imageManager.clear();
        log.info("[Viewer] Image cache cleared");
    }

    async removeImageCache(urls: string[] | string) {
        if (!this.enableCache) {
            return;
        }
        urls = Array.isArray(urls) ? urls : [urls];
        urls.forEach(async (url) => {
            await this.imageManager.remove(url);
        });
    }

    /**
     * Sets camera position and direction.
     */
    setCameraPositionAndDirection(position: number[], direction?: number[]) {
        const pos = new THREE.Vector3(position[0], position[1], position[2]);
        let dir;
        if (direction) {
            dir = new THREE.Vector3(direction[0], direction[1], direction[2]);
        } else {
            dir = this.getCameraDirection();
        }
        const target = pos.clone().addScaledVector(dir, 1e-5);
        this.cameraManager.flyTo(pos, target);
    }

    /**
     * Gets camera position and direction.
     */
    getCameraPositionAndDirection() {
        const pos = this.camera.position;
        const dir = this.cameraManager.getCameraDirection();
        return { position: [pos.x, pos.y, pos.z], direction: [dir.x, dir.y, dir.z] };
    }

    /**
     * Unlimits controls and show all assets. This is useful for debugging.
     * @internal
     */
    unlimitControlsAndShowPanorama(showAllHotpoints = true) {
        this.cameraManager.enablePan(true);
        this.scene.traverse((child) => {
            if (child instanceof BasePanoMesh) {
                child.visible = true;
            }
            if (showAllHotpoints && child.name === "hotpoints") {
                this.setCss2dObjectsVisible(child as THREE.Group, true);
            }
        });
    }

    getHitResult(event: { x: number; y: number }) {
        const mousePosition = new THREE.Vector2(event.x, event.y);
        const result = this.pickManager.pickObject(mousePosition, [this.scene]);
        return result?.point;
    }

    lookToPosition(position: number[]) {
        const p = this.camera.position;
        const t = new THREE.Vector3(position[0], position[1], position[2]);
        const dir = t.clone().sub(p);
        this.setCameraPositionAndDirection(p.toArray(), dir.toArray());
    }

    setMinAndMaxZoom(minZoom: number, maxZoom: number) {
        this.cameraManager.cameraControls.minZoom = minZoom;
        this.cameraManager.cameraControls.maxZoom = maxZoom;
    }

    setZoom(zoom: number) {
        this.cameraManager.cameraControls.zoomTo(zoom, true);
    }

    getZoom() {
        return this.camera.zoom;
    }

    setAutoRotateEnabled(enable: boolean) {
        this.enableAutoRotate = enable;
    }

    setAutoRotateSpeed(speed: number) {
        this.autoRotateSpeed = speed;
    }

    destroy(): void {
        super.destroy();
        this.setViewpoints([]);
        this.imageManager.destroy();
    }
}
