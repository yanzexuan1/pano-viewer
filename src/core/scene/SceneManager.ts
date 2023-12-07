import * as THREE from "three";

import type { BaseViewer } from "src/core/viewers/BaseViewer";

export class SceneManager {
    private viewer: BaseViewer;
    public scene: THREE.Scene;
    public renderer: THREE.WebGLRenderer;
    private lights?: THREE.Group;
    private modelGroup: THREE.Group;

    constructor(viewer: BaseViewer) {
        this.viewer = viewer;

        // scene
        const scene = new THREE.Scene();
        // scene.background = new THREE.Color(0x212830);
        // scene.matrixAutoUpdate = MatrixAutoUpdate;
        // scene.matrixWorldAutoUpdate = MatrixAutoUpdate;
        this.scene = scene;
        this.modelGroup = new THREE.Group();
        this.modelGroup.name = "models";
        this.scene.add(this.modelGroup);

        // renderer
        const { width, height, viewerContainer } = viewer.container;
        const r = new THREE.WebGLRenderer({
            antialias: true,
            preserveDrawingBuffer: true,
        });
        r.setPixelRatio(window.devicePixelRatio);
        r.setSize(width, height);
        // this.renderer.setClearColor(0xa9a9a9, 1);
        r.outputColorSpace = THREE.SRGBColorSpace;
        r.toneMappingExposure = 1;
        // this.renderer.useLegacyLights = false;
        r.localClippingEnabled = true; // for section
        // shadow
        r.shadowMap.enabled = false;
        r.shadowMap.type = THREE.PCFSoftShadowMap;
        r.shadowMap.autoUpdate = false;
        r.domElement.style.outlineWidth = "0";
        viewerContainer?.appendChild(r.domElement);
        this.renderer = r;
    }

    private initLights() {
        const lights = new THREE.Group();
        lights.name = "lights";

        const highIntensity = 1.5;
        const color = 0xffffff;

        // Directional light
        const dl = new THREE.DirectionalLight(color, highIntensity);
        dl.name = "sun";
        dl.castShadow = true;
        dl.position.set(-2, 2, 4);
        dl.shadow.autoUpdate = false;
        dl.shadow.mapSize.width = 1024;
        dl.shadow.mapSize.height = 1024;

        // Ambient light
        const ambientLight = new THREE.AmbientLight(color);
        ambientLight.name = "ambient";

        // Hemisphere light
        const hemisphereLight = new THREE.HemisphereLight(color, 0xdddddd, 0.2);
        hemisphereLight.name = "hemisphere";
        hemisphereLight.position.set(0, 300, 0);

        // Light helpers
        const lightHelpers = new THREE.Group();
        lightHelpers.name = "lightHelpers";
        lightHelpers.visible = false;
        const directionalLightHelper = new THREE.DirectionalLightHelper(dl);
        // directionalLightHelper.visible = true;
        const cameraHelper = new THREE.CameraHelper(dl.shadow.camera);
        // cameraHelper.visible = true;
        lightHelpers.add(directionalLightHelper);
        lightHelpers.add(cameraHelper);

        lights.add(dl);
        lights.add(dl.target);
        lights.add(ambientLight);
        lights.add(hemisphereLight);
        lights.add(lightHelpers);

        this.scene.add(lights);
        this.lights = lights;
        return lights;
    }

    get maxFragmentUniforms() {
        // Leave 20 more space
        return this.renderer.capabilities.maxFragmentUniforms - 20;
    }

    enableShadow(enable: boolean) {
        this.renderer.shadowMap.enabled = enable;
        this.directionalLight.castShadow = enable;

        if (enable) {
            this.updateDirectionalLightShadow();
        }

        this.modelGroup.traverse((obj: THREE.Object3D) => {
            // eslint-disable-next-line
            if ((obj as any).isMesh) {
                obj.castShadow = enable;
                obj.receiveShadow = enable;
            }
        });
    }

    enableClipping(enable: boolean) {
        this.renderer.localClippingEnabled = enable;
    }

    setClipPlanes(planes: THREE.Plane[]) {
        this.renderer.clippingPlanes = planes;
    }

    enableLights(enable: boolean) {
        let lights = this.lights;
        if (!lights) {
            lights = this.initLights();
        }
        lights.visible = enable;
    }

    debugLights(enable: boolean) {
        if (!this.lights || !this.lightHelpers) {
            return;
        }

        this.lightHelpers.visible = enable;
    }

    setBackground(background: THREE.Color | THREE.CubeTexture | THREE.Texture | null) {
        this.scene.background = background;
    }

    get directionalLight(): THREE.DirectionalLight {
        return this.lights?.getObjectByName("sun") as THREE.DirectionalLight;
    }

    get ambientLight() {
        return this.lights?.getObjectByName("ambient");
    }

    get hemisphereLight() {
        return this.lights?.getObjectByName("hemisphere");
    }

    get lightHelpers() {
        return this.lights?.getObjectByName("lightHelpers");
    }

    get directionalLightHelper(): THREE.DirectionalLightHelper {
        let helper: THREE.DirectionalLightHelper | undefined = undefined;
        for (let i = 0; this.lightHelpers && i < this.lightHelpers?.children.length; ++i) {
            const h = this.lightHelpers.children[i];
            if (h instanceof THREE.DirectionalLightHelper) {
                helper = h as THREE.DirectionalLightHelper;
                break;
            }
        }
        return helper as THREE.DirectionalLightHelper;
    }

    get cameraHelper(): THREE.CameraHelper {
        let helper: THREE.CameraHelper | undefined = undefined;
        for (let i = 0; this.lightHelpers && i < this.lightHelpers?.children.length; ++i) {
            const h = this.lightHelpers.children[i];
            if (h instanceof THREE.CameraHelper) {
                helper = h as THREE.CameraHelper;
            }
        }
        return helper as THREE.CameraHelper;
    }

    resize() {
        const { width, height } = this.viewer.container;
        this.renderer.setSize(width, height);
    }

    public getRaycastableObjects() {
        const objects: THREE.Object3D[] = [];
        this.modelGroup.traverse((o) => {
            objects.push(o);
        });
        return objects;
    }

    private updateDirectionalLightShadow() {
        if (!this.directionalLight) {
            return;
        }
        this.directionalLight.shadow.needsUpdate = true;
    }

    /**
     * @internal
     */
    showDirectionalLightHelper(visible: boolean) {
        if (this.directionalLightHelper) {
            this.directionalLightHelper.visible = visible;
        }

        if (this.cameraHelper) {
            this.cameraHelper.visible = visible;
        }
    }

    destroy() {
        this.lightHelpers?.clear();
        this.lightHelpers?.removeFromParent();
        this.lightHelpers?.traverse((obj) => {
            // @ts-ignore
            obj.dispose?.();
        });
        this.lights?.clear();
        this.lights?.removeFromParent();
        this.lights?.traverse((obj) => {
            // @ts-ignore
            obj.dispose?.();
        });
        this.lights = undefined;

        this.renderer.domElement.remove();
        this.renderer.clear();
        this.renderer.dispose();
        this.renderer.forceContextLoss(); // cleans up threejs WebGl contexts.

        this.scene.clear();
    }
}
