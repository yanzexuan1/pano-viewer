/**
 * Camera config
 */
export interface CameraConfig {
    /**
     * The camera location
     */
    eye: number[];
    /**
     * The location that the camera looks to
     */
    look: number[];
    /**
     * @internal
     */
    up?: number[];
    /**
     * The camera zoom
     */
    zoom?: number;
    /**
     * The camera's near clip plane
     */
    near?: number;
    /**
     * The camera's far clip plane
     */
    far?: number;
}

/**
 * Common viewer config
 */
export interface BaseViewerConfig {
    /**
     * @description canvas id to contain the viewer.
     */
    containerId: string;

    /**
     * @internal
     */
    logLevel?: "debug" | "info" | "warn" | "error" | "silent";
}

/**
 * This wrappers most config for PanoViewer
 */
export interface PanoViewerConfig extends BaseViewerConfig {
    autoRotateSpeed?: number;
    enableCache?: boolean;
}

/**
 * Panorama viewpoint's hotpoint, which can be a user defined html element.
 * A hotpoint can be clicked, then caller can do their own operation,
 * e.g. open a description panel, jump to another viewpoint, etc.
 */
export interface Hotpoint {
    hotpointId: string; // TODO: rename it to "id"
    anchorPosition: number[];
    visible?: boolean; // true, by default
    html: string; // used by caller to create their own HTMLElement
}

/**
 * A Panorama contains 1 or more panor
 * A viewpoint may contain more than one plans
 */
export interface Panorama {
    id: string;
    /**
     * 1, 6 or 24 image urls in order of right, left, up, down, front, back.
     * When there is 1 image, caller should also put it into array!
     */
    images: string[];
    /**
     * 6 image urls in order of right, left, up, down, front, back
     */
    thumbnails?: string[]; // must be 6 image urls in proper order
}

/**
 * Panorama viewpoint.
 */
export interface PanoViewpoint {
    /**
     * @deprecated moved to Panorama
     */
    imageOrImages?: string | string[]; // 1, 6 or 24 image urls in proper order
    /**
     * @deprecated moved to Panorama
     */
    thumbnailImages?: string[]; // must be 6 image urls in proper order
    panoramas: Panorama[];
    id: string;
    name?: string; // Room 1, etc.
    position?: number[]; // the camera position where VR is taken
    initialDirection?: number[]; // look at a good direction with this
    hotpoints?: Hotpoint[];
}

/**
 * @internal
 */
export interface ScreenshotConfig {
    type: string;
    quality: number;
    includeOverlay: boolean;
}
