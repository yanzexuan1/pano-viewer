import * as THREE from "three";

import CameraControls from "../camera-controls";
import { BaseControls, ControlsMode } from "./Control";
import type { CameraManager } from "src/core/camera/CameraManager";

/**
 * Controls for panorama viewers.
 */
export class PanoControls implements BaseControls {
    readonly mode = ControlsMode.FirstPerson;
    private cameraManager: CameraManager;

    constructor(cameraManager: CameraManager) {
        this.cameraManager = cameraManager;
    }

    setupControl() {
        const controls = this.cameraManager.cameraControls;
        controls.mouseButtons = {
            left: CameraControls.ACTION.ROTATE,
            middle: CameraControls.ACTION.NONE,
            right: CameraControls.ACTION.ROTATE,
            wheel: CameraControls.ACTION.ZOOM,
        };

        controls.touches = {
            one: CameraControls.ACTION.TOUCH_ROTATE,
            two: CameraControls.ACTION.TOUCH_ZOOM,
            three: CameraControls.ACTION.NONE,
        };
        controls.dollyToCursor = false;
        controls.infinityDolly = false;
        controls.azimuthRotateSpeed = -0.2;
        controls.polarRotateSpeed = -0.2;
        controls.minPolarAngle = Math.PI * 0.05;
        controls.maxPolarAngle = Math.PI * 0.95;
        controls.minZoom = 0.5;
        controls.maxZoom = 2;
        this.cameraManager.enablePan(false);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    adjustCameraByBbox(box: THREE.Box3) {
        //
    }
}
