/**
 * Controls mode.
 */
export enum ControlsMode {
    Orbit,
    FirstPerson,
    Plan,
    Panorama,
}

/**
 * Base class for controls.
 */
export interface BaseControls {
    mode: ControlsMode;

    setupControl(): void;
    adjustCameraByBbox(bbox: THREE.Box3): void;
}
