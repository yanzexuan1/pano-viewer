/**
 * Viewer events
 */
export enum ViewerEvent {
    /**
     * Triggered when click viewer
     */
    MouseClick = "mouseclick",

    /**
     * Triggered before rendered.
     */
    BeforeRender = "beforerender",

    /**
     * Triggered when rendered
     * @internal
     */
    AfterRender = "afterrender",

    /**
     * Triggered when animate() is executed.
     * @internal
     */
    OnAnimate = "onanimate",

    /**
     * Triggered when Viewered switch camera
     * @internal
     */
    CameraChange = "camerachange",

    /**
     * Triggered when control end
     * @internal
     */
    ControlChange = "controlchange",

    /**
     * Triggered when click hotpoint
     */
    HotpointClick = "hotpointclick",
}
