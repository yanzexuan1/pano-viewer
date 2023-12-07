import * as THREE from "three";
import { CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";

import { Spinner } from "../components";
import { ViewerName } from "./Constants";
import { Plugin } from "./Plugin";
import { ViewerEvent } from "./ViewerEvent";
import { BaseViewerConfig, CameraConfig } from "src/core/Configs";
import { CameraInfo, CameraManager } from "src/core/camera";
import { Container } from "src/core/components/Container";
import { InputManager } from "src/core/input-manager";
import { PickManager } from "src/core/pick";
import { SceneManager } from "src/core/scene/SceneManager";
import { CommonUtils, Event, log, setLogLevel } from "src/core/utils";

type ViewerEvents = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [K in ViewerEvent]: any;
};

export abstract class BaseViewer extends Event<ViewerEvents> {
    name = ViewerName.BaseViewer;
    protected viewerCfg: BaseViewerConfig;

    private clock: THREE.Clock = new THREE.Clock();
    protected fps = 60;
    protected timeStamp = 0;
    /**
     * @internal
     */
    protected requestAnimationFrameHandle?: number;
    container: Container;

    protected plugins: Plugin[] = [];

    protected homeView?: CameraConfig;

    protected inputManager: InputManager;
    protected cameraManager: CameraManager;
    protected sceneManager: SceneManager;
    protected pickManager: PickManager;
    protected css2dRenderer: CSS2DRenderer;
    protected spinner: Spinner;

    /**
     * Enables selecting an object
     */
    protected _enableSelection = true;

    constructor(viewerCfg: BaseViewerConfig) {
        super();
        this.viewerCfg = viewerCfg;

        // init system config
        this.initLogLevel();

        // container
        this.container = new Container(viewerCfg.containerId);

        // spinner
        this.spinner = new Spinner(this.container);
        // three
        this.sceneManager = new SceneManager(this);
        // TODO:effect

        // pick
        this.pickManager = new PickManager(this);

        this.css2dRenderer = this.initCSS2DRenderer();
        // input
        this.inputManager = new InputManager(this.viewerContainer);
        // control
        this.cameraManager = new CameraManager(this);

        this.resize();
        this.clock.start();
        this.animate();
    }

    private initLogLevel() {
        const l = this.viewerCfg.logLevel;
        if (l) {
            setLogLevel(l);
        }
    }

    get viewerContainer(): HTMLElement {
        return this.container.viewerContainer as HTMLElement;
    }

    get widgetContainer() {
        return this.container.widgetContainer as HTMLElement;
    }

    getInputManager() {
        return this.inputManager;
    }

    getCameraManager() {
        return this.cameraManager;
    }

    get renderer() {
        return this.sceneManager.renderer;
    }

    get camera() {
        return this.cameraManager.camera;
    }

    get scene() {
        return this.sceneManager.scene;
    }

    /**
     * Gets if selection is enabled.
     */
    abstract get enableSelection();

    /**
     * Sets if selection is enabled.
     * A derived class may need to clean up selected object if any.
     */
    abstract set enableSelection(enable: boolean);

    getRaycaster() {
        return this.pickManager.getRaycaster();
    }

    getViewConfig() {
        return this.viewerCfg;
    }

    getSpinner() {
        return this.spinner;
    }

    private initCSS2DRenderer() {
        const r = new CSS2DRenderer();
        const { width, height } = this.viewerContainer.getBoundingClientRect();
        r.setSize(width, height);
        r.domElement.style.height = "0";
        r.domElement.style.width = "0";
        r.domElement.style.position = "absolute";
        r.domElement.style.top = "0";
        r.domElement.style.left = "0";
        r.domElement.style.overflow = "visible";
        r.domElement.classList.add("css2d-renderer"); // add a class so it is easier to be found

        this.viewerContainer?.appendChild(r.domElement);
        return r;
    }

    protected animate() {
        const delta = Date.now() - this.timeStamp;
        const singleFrameTime = 1 / this.fps;
        if (delta < singleFrameTime) {
            this.requestAnimationFrameHandle = requestAnimationFrame(this.animate.bind(this));
            return;
        }
        const updated = this.cameraManager.update(this.clock.getDelta());
        if (this.container.needResize) {
            this.resize();
        }
        if (updated) {
            this.dispatchEvent(ViewerEvent.BeforeRender);
            //render
            this.renderer.render(this.scene, this.camera);
            this.css2dRenderer.render(this.scene, this.camera);
            this.dispatchEvent(ViewerEvent.AfterRender);
        }
        this.requestAnimationFrameHandle = requestAnimationFrame(this.animate.bind(this));
        this.timeStamp = Date.now();
        this.dispatchEvent(ViewerEvent.OnAnimate);
    }

    resize() {
        this.sceneManager.resize();
        this.cameraManager.updateAspect();
        const { clientWidth, clientHeight } = this.viewerContainer;
        this.css2dRenderer.setSize(clientWidth, clientHeight);
    }

    /**
     * Gets how long a pixel represents in world coordinate.
     * This works fine for OrthographicCamera.
     * As for PerspectiveCamera, a pixel represents different size for different position,
     * depends on how far the camera is and its fov, etc. We'll simply take the camera target as the position to calculate.
     * @internal
     */
    getPixelSizeInWorldCoord() {
        const camera = this.camera as THREE.Camera;
        const { clientWidth: w, clientHeight: h } = this.viewerContainer as HTMLElement;
        let size = 1;
        if (camera.type === "OrthographicCamera") {
            const c = camera as THREE.OrthographicCamera;
            size = Math.max(c.right - c.left, c.top - c.bottom) / c.zoom / Math.max(w, h);
        } else if (camera.type === "PerspectiveCamera") {
            const c = camera as THREE.PerspectiveCamera;
            const eye = new THREE.Vector3();
            camera.getWorldPosition(eye);
            const target = this.cameraManager.getTarget();

            if (eye && target) {
                const targetDistance = eye.distanceTo(target) * Math.tan(((c.fov / 2) * Math.PI) / 180);
                size = (2 * targetDistance) / h;
            }
        }
        return size;
    }

    public flyToObject(object: THREE.Object3D) {
        this.cameraManager.flyToObject(object);
    }

    public flyToObjects(objects: THREE.Object3D[]) {
        const bbox = new THREE.Box3();
        objects.forEach((object) => {
            const box = new THREE.Box3().setFromObject(object);
            bbox.union(box);
        });

        const sphere = new THREE.Sphere();
        bbox.getBoundingSphere(sphere);
        this.cameraManager.fitToSphere(sphere);
    }

    /**
     * Make camera fly to target position with given lookAt position
     * @param position camera's target position
     * @param lookAt camera's new lookAt position
     */
    public flyTo(position: THREE.Vector3, lookAt: THREE.Vector3) {
        const camera = this.camera;
        if (position.equals(lookAt)) {
            log.error("[Viewer] camera position and lookAt cannot be the same!");
            return;
        } else if (!CommonUtils.isVectorValid(position) || !CommonUtils.isVectorValid(lookAt)) {
            log.error("[Viewer] invalid position or lookAt!");
            return;
        }
        // If distance between position and lookAt is too near or far (according to camera's near/far settings).
        // need to adjust 'position' to fit it.
        const distance = position.distanceTo(lookAt);
        if (distance < camera.near) {
            // the new position is just farer than original position
            position = position
                .clone()
                .sub(lookAt)
                .normalize()
                .multiplyScalar(camera.near * 1.1);
            log.warn("[Viewer] camera could be too close to see the object!");
        } else if (distance > camera.far) {
            // the new position is just closer than original position
            position = position
                .clone()
                .sub(lookAt)
                .normalize()
                .multiplyScalar(camera.far * 0.9);
            log.warn("[Viewer] camera could be too far to see the object!");
        }

        // It seem that setOrbitPoint and setLookAt can not use in the same
        this.cameraManager.flyTo(position, lookAt);
    }

    /**
     * Goes to home view
     */
    public goToHomeView() {
        if (!this.homeView) {
            return;
        }
        this.cameraManager.setCameraInfo(this.homeView);
    }

    /**
     * @description {en} Sets background color.
     * @param r Red channel value between 0 and 1.
     * @param g Green channel value between 0 and 1.
     * @param b Blue channel value between 0 and 1.
     * @example
     * ``` typescript
     * // Sets background to gray
     * viewer.setBackgroundColor(0.5, 0.5, 0.5);
     * ```
     */
    public setBackgroundColor(r: number, g: number, b: number) {
        if (!this.scene.background) {
            this.scene.background = new THREE.Color(r, g, b);
        }
        if (this.scene.background instanceof THREE.Color) {
            const c = new THREE.Color();
            c.setRGB(r, g, b, this.renderer.outputColorSpace);
            this.scene.background.copy(c);
        }
    }

    public enableControl(enable: boolean) {
        this.cameraManager.enableControl(enable);
    }

    public enableRotate(enable: boolean) {
        this.cameraManager.enableRotate = enable;
    }

    public enableZoom(enable: boolean) {
        this.cameraManager.enableZoom(enable);
    }

    public enablePan(enable: boolean) {
        this.cameraManager.enablePan(enable);
    }

    public getCameraInfo() {
        return this.cameraManager.getCameraInfo();
    }

    public setCameraInfo(cameraInfo: CameraInfo) {
        return this.cameraManager.setCameraInfo(cameraInfo);
    }

    public getCameraDirection() {
        return this.cameraManager.getCameraDirection();
    }

    public getRenderInfo() {
        const info = this.renderer.info;
        return {
            drawCalls: info.render.calls,
            lines: info.render.lines,
            points: info.render.points,
            triangles: info.render.triangles,
            geometries: info.memory.geometries,
            textures: info.memory.textures,
            materials: info.programs?.length || 0,
        };
    }

    /**
     *
     */
    destroy() {
        if (this.requestAnimationFrameHandle) {
            cancelAnimationFrame(this.requestAnimationFrameHandle);
        }
        this.css2dRenderer.domElement.remove();
        this.container.destroy();
        this.sceneManager.destroy();
        this.cameraManager.destroy();
        this.spinner.destroy();
    }

    /**
     * Installs a Plugin.
     */
    addPlugin(plugin: Plugin) {
        const p = this.plugins.find((p) => p.id === plugin.id);
        if (p) {
            log.warn(`[Viewer] Plugin already exist: ${plugin.id}`);
            return;
        }
        this.plugins.push(plugin);
        log.debug(`[Viewer] Added plugin: ${plugin.id}`);
    }

    /**
     * Uninstalls a Plugin, clearing content from it first.
     */
    removePlugin(plugin: Plugin) {
        for (let i = 0, len = this.plugins.length; i < len; i++) {
            const p = this.plugins[i];
            if (p === plugin) {
                this.plugins.splice(i, 1);
                return;
            }
        }
    }

    /**
     * Clears all plugins.
     * A plugin is not created by viewer, thus, won't be destroyed by viewer.
     */
    clearPlugins() {
        this.plugins = [];
    }

    /**
     * Finds a Plugin.
     */
    findPlugin(id: string): Plugin | undefined {
        return this.plugins.find((p) => p.id === id);
    }
}
