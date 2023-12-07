import * as THREE from "three";

import { CameraConfig } from "src/core/Configs";
import CameraControls from "src/core/camera-controls";
import { mouseButtonAction } from "src/core/camera-controls/types";
import { PanoControls } from "src/core/controls";
import { BaseControls, ControlsMode } from "src/core/controls/Control";
import { EventInfo } from "src/core/input-manager/InputManager";
import { CommonUtils, log } from "src/core/utils";
import { type BaseViewer } from "src/core/viewers/BaseViewer";
import { ViewerEvent } from "src/core/viewers/ViewerEvent";

export enum CameraProjection {
    Perspective,
    Orthographic,
}

export type CameraInfo = CameraConfig;

const frustumSize = 50;
const tempVec3 = /*@__PURE__*/ new THREE.Vector3();

export class CameraManager {
    private viewer: BaseViewer;
    readonly perspectiveCamera: THREE.PerspectiveCamera;
    readonly orthographicCamera: THREE.OrthographicCamera;
    activeCamera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
    readonly cameraControls: CameraControls;

    private previousDistance = -1;
    private previousAzimuthRotateSpeed = 1;
    private previousPolarRotateSpeed = 1;
    private previousDollySpeed = 1;
    private previousTruckSpeed = 2;
    private previousMouseLeft: mouseButtonAction = CameraControls.ACTION.NONE;

    protected enableKeyDown = true;

    /**
     * A map/list of different controls
     */
    private controlsMap: Record<string, BaseControls>;
    private activeControls: BaseControls;
    private projection: CameraProjection = CameraProjection.Perspective;

    constructor(viewer: BaseViewer) {
        this.viewer = viewer;
        const viewerContainer = viewer.viewerContainer;
        const aspect = viewerContainer.clientWidth / viewerContainer.clientHeight;
        this.perspectiveCamera = new THREE.PerspectiveCamera(45, aspect, 0.1, 2000);

        this.orthographicCamera = new THREE.OrthographicCamera(
            (frustumSize * aspect) / -2,
            (frustumSize * aspect) / 2,
            frustumSize / 2,
            frustumSize / -2,
            0.1,
            1000
        );
        this.activeCamera = this.perspectiveCamera;
        this.setupCameras();

        CameraControls.install({ THREE: THREE });
        this.cameraControls = new CameraControls(this.perspectiveCamera, viewer.getInputManager() as unknown as HTMLElement);

        this.controlsMap = {
            [ControlsMode.Panorama]: new PanoControls(this),
        };
        this.activeControls = this.controlsMap[ControlsMode.Panorama];

        // set default camera control
        this.setupControls();
        this.setProjection(CameraProjection.Perspective);
    }

    get viewerContainer() {
        return this.viewer.viewerContainer;
    }

    get inputManager() {
        return this.viewer.getInputManager();
    }

    private setOrthoCameraAspect(width: number, height: number) {
        const aspect = width / height;
        this.orthographicCamera.left = (-frustumSize * aspect) / 2;
        this.orthographicCamera.right = (frustumSize * aspect) / 2;
        this.orthographicCamera.top = frustumSize / 2;
        this.orthographicCamera.bottom = -frustumSize / 2;
        this.orthographicCamera.updateProjectionMatrix();
    }

    private setupCameras() {
        this.setCameraPositionAndTarget(this.perspectiveCamera);
    }

    private setCameraPositionAndTarget(camera: THREE.Camera) {
        // default
        camera.position.z = 10;
        camera.position.y = 10;
        camera.position.x = 10;
        camera.lookAt(new THREE.Vector3(0, 0, 0));
    }

    private setupControls() {
        const cc = this.cameraControls;
        cc.smoothTime = 0.1;
        cc.draggingSmoothTime = 0;
        cc.infinityDolly = true;
        cc.setTarget(0, 0, 0);

        cc.addEventListener("controlend", () => this.onChange);
        cc.addEventListener("update", () => this.viewer.dispatchEvent(ViewerEvent.ControlChange));
        // When the camera movement is below .restThreshold
        cc.addEventListener("rest", () => this.onChange);
        this.inputManager.addEventListener("keydown", this.onKeyDown);
    }

    private onKeyDown = (e: EventInfo) => {
        if (!this.enableKeyDown) {
            return;
        }
        const cc = this.cameraControls;
        switch (e.code) {
            case "ArrowLeft":
                cc.rotate(0.1, 0, true);
                break;
            case "ArrowRight":
                cc.rotate(-0.1, 0, true);
                break;
            case "ArrowUp":
                cc.rotate(0, 0.1, true);
                break;
            case "ArrowDown":
                cc.rotate(0, -0.1, true);
                break;
        }
    };

    private onChange = () => {
        // do nothing
    };

    setOrthoCamera() {
        // Matching orthographic camera to perspective camera
        // Resource: https://stackoverflow.com/questions/48758959/what-is-required-to-convert-threejs-perspective-camera-to-orthographic
        if (this.activeControls.mode === ControlsMode.FirstPerson) {
            return;
        }
        this.previousDistance = this.cameraControls.distance;
        this.cameraControls.distance = 200;
        const { width, height } = this.getDims();
        this.setupOrthoCamera(height, width);
        this.activeCamera = this.orthographicCamera;
        this.projection = CameraProjection.Orthographic;
    }

    private getDims() {
        const lineOfSight = new THREE.Vector3();
        this.perspectiveCamera.getWorldDirection(lineOfSight);
        const target = new THREE.Vector3();
        this.cameraControls.getTarget(target);
        const distance = target.clone().sub(this.perspectiveCamera.position);
        const depth = distance.dot(lineOfSight);
        const { clientWidth, clientHeight } = this.viewer.viewerContainer;
        const aspect = clientWidth / clientHeight;
        const fov = this.perspectiveCamera.fov;
        const height = depth * 2 * Math.atan((fov * (Math.PI / 180)) / 2);
        const width = height * aspect;
        return { width, height };
    }

    private setupOrthoCamera(height: number, width: number) {
        this.cameraControls.mouseButtons.wheel = CameraControls.ACTION.ZOOM;
        const pc = this.perspectiveCamera;
        const oc = this.orthographicCamera;
        oc.zoom = 1;
        oc.left = width / -2;
        oc.right = width / 2;
        oc.top = height / 2;
        oc.bottom = height / -2;
        oc.updateProjectionMatrix();
        oc.position.copy(pc.position);
        oc.quaternion.copy(pc.quaternion);
        this.cameraControls.camera = oc;
    }

    private setPerspectiveCamera() {
        const cc = this.cameraControls;
        cc.mouseButtons.wheel = CameraControls.ACTION.DOLLY;
        const pc = this.perspectiveCamera;
        const oc = this.orthographicCamera;
        pc.position.copy(oc.position);
        pc.quaternion.copy(oc.quaternion);
        pc.updateProjectionMatrix();
        cc.camera = pc;
        cc.mouseButtons.wheel = CameraControls.ACTION.DOLLY;
        this.activeCamera = pc;
        this.projection = CameraProjection.Perspective;
        cc.distance = this.previousDistance;
        cc.zoomTo(1);
    }

    public update(delta: number) {
        return this.cameraControls.update(delta);
    }

    updateAspect() {
        const { clientWidth, clientHeight } = this.viewer.viewerContainer;
        this.perspectiveCamera.aspect = clientWidth / clientHeight;
        this.perspectiveCamera.updateProjectionMatrix();
        this.setOrthoCameraAspect(clientWidth, clientHeight);
    }

    get camera() {
        return this.activeCamera;
    }

    public enableKeyControl(enable: boolean) {
        this.enableKeyDown = enable;
    }

    public getTarget() {
        return this.cameraControls.getTarget(tempVec3);
    }

    public getPosition() {
        return this.cameraControls.getPosition(tempVec3);
    }

    public adjustCameraByBbox(bbox: THREE.Box3) {
        const near = this.camera.near;
        const far = this.camera.far;
        const size = new THREE.Vector3();
        bbox.getSize(size);
        const maxSize = size.length();
        const factor = 5; // a value according to experience
        const maxNear = maxSize / factor; // camera.near shouldn't bigger than this
        const minFar = maxSize * factor; // camera.far shouldn't smaller than this
        if (near > maxNear || far < minFar) {
            const n2s = (n: number): string => CommonUtils.numberToString(n);
            log.info(`[Viewer] BBox's longest side is: ${n2s(maxSize)}`);
            if (near > maxNear) {
                log.warn(`[Viewer] camera.near(${n2s(near)}) shouldn't bigger than ${n2s(maxNear)}, will change it!`);
                this.camera.near = maxNear;
            }
            if (far < minFar) {
                log.warn(`[Viewer] camera.far(${n2s(far)}) shouldn't smaller than ${n2s(minFar)}, will change it!`);
                this.camera.far = minFar;
            }
        }

        this.activeControls.adjustCameraByBbox(bbox);
        this.cameraControls.update(0);
    }

    public enableControl(active: boolean) {
        this.cameraControls.enabled = active;
    }

    get enableRotate(): boolean {
        const cc = this.cameraControls;
        return !!cc.azimuthRotateSpeed || !!cc.polarRotateSpeed;
    }

    set enableRotate(enable: boolean) {
        const cc = this.cameraControls;
        if (enable) {
            cc.azimuthRotateSpeed = this.previousAzimuthRotateSpeed;
            cc.polarRotateSpeed = this.previousPolarRotateSpeed;
        } else {
            this.previousAzimuthRotateSpeed = cc.azimuthRotateSpeed;
            this.previousPolarRotateSpeed = cc.polarRotateSpeed;
            cc.azimuthRotateSpeed = 0;
            cc.polarRotateSpeed = 0;
        }
    }

    public enableZoom(enable: boolean) {
        const cc = this.cameraControls;
        if (enable) {
            cc.dollySpeed = this.previousDollySpeed;
        } else {
            this.previousDollySpeed = cc.dollySpeed;
            cc.dollySpeed = 0;
        }
    }

    public enablePan(enable: boolean) {
        const cc = this.cameraControls;
        if (enable) {
            cc.truckSpeed = this.previousTruckSpeed;
        } else {
            this.previousTruckSpeed = cc.dollySpeed;
            cc.truckSpeed = 0;
        }
    }

    public enableMouseLeft(enable: boolean) {
        const cc = this.cameraControls;
        if (enable) {
            cc.mouseButtons.left = this.previousMouseLeft;
        } else {
            this.previousMouseLeft = cc.mouseButtons.left;
            cc.mouseButtons.left = CameraControls.ACTION.NONE;
        }
    }

    public setCameraPosition(position: THREE.Vector3) {
        this.cameraControls.setPosition(position.x, position.y, position.z);
    }

    public setCameraTarget(target: THREE.Vector3) {
        this.cameraControls.setTarget(target.x, target.y, target.z);
    }

    public flyTo(position: THREE.Vector3, lookAt: THREE.Vector3) {
        const cc = this.cameraControls;
        cc.setLookAt(position.x, position.y, position.z, lookAt.x, lookAt.y, lookAt.z, true);
        cc.setFocalOffset(0, 0, 0, true);
    }

    public flyToPosition(x: number, y: number, z: number) {
        this.cameraControls.moveTo(x, y, z, true);
    }

    public flyToBox(box: THREE.Box3) {
        const sphere = new THREE.Sphere();
        box.getBoundingSphere(sphere);
        this.cameraControls.fitToSphere(sphere, true);
        // this.cameraControls.fitToBox(box, true, fitOptions);
    }

    public fitToSphere(box: THREE.Object3D | THREE.Sphere) {
        this.cameraControls.fitToSphere(box, true);
    }

    public flyToObject(object: THREE.Object3D) {
        const bbox = new THREE.Box3().setFromObject(object);
        const sphere = new THREE.Sphere();
        bbox.getBoundingSphere(sphere);
        this.cameraControls.fitToSphere(sphere, true);
    }

    public getDistanceToFitSphere(radius: number) {
        return this.cameraControls.getDistanceToFitSphere(radius);
    }

    public setNavigationMode(mode: ControlsMode) {
        if (this.activeControls.mode === mode) {
            return;
        }
        this.activeControls = this.controlsMap[mode];
        this.activeControls.setupControl();
    }

    public setProjection(proj: CameraProjection) {
        if (this.projection === proj) {
            return;
        }
        this.projection = proj;
        if (proj === CameraProjection.Orthographic) {
            this.setOrthoCamera();
        } else {
            this.setPerspectiveCamera();
        }
    }

    public setOrbitPoint(point: THREE.Vector3) {
        this.cameraControls.setOrbitPoint(point.x, point.y, point.z);
    }

    public getCameraDirection() {
        return this.activeCamera.getWorldDirection(tempVec3);
    }

    public getCameraInfo() {
        return {
            near: this.activeCamera.near,
            far: this.activeCamera.far,
            zoom: this.activeCamera.zoom,
            eye: this.activeCamera.position.toArray(),
            up: this.activeCamera.up.toArray(),
            look: this.getTarget().toArray(),
        };
    }

    public setCameraInfo(cameraInfo: CameraInfo) {
        const cc = this.cameraControls;
        const { near = 0.1, far = 100000, up = [0, 1, 0], zoom = 1, eye, look } = cameraInfo;
        this.activeCamera.near = near;
        this.activeCamera.far = far;
        this.activeCamera.up.set(up[0], up[1], up[2]);
        this.activeCamera.updateProjectionMatrix();
        cc.updateCameraUp();
        cc.zoomTo(zoom);
        cc.setLookAt(eye[0], eye[1], eye[2], look[0], look[1], look[2], true);
        cc.setFocalOffset(0, 0, 0, true);
    }

    destroy() {
        this.inputManager.removeEventListener("keydown", this.onKeyDown);
        this.perspectiveCamera.removeFromParent();
        this.orthographicCamera.removeFromParent();
    }
}
