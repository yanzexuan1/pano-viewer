import { log } from "src/core/utils";

export class Container {
    width = 0;
    height = 0;

    container: HTMLDivElement;
    viewerContainer?: HTMLDivElement;
    widgetContainer?: HTMLDivElement;

    constructor(containerId: string) {
        let container = document.getElementById(containerId);
        if (!container) {
            log.warn("[Container] containerId:", containerId, "is not found in dom tree! will append to document body");
            container = document.body;
        }
        const div = document.createElement("div");
        div.classList.add("pano-container");
        div.style.cssText = `width: 100%; height: 100%; position: relative;`;
        container.appendChild(div);
        this.container = div;
        this.width = container.clientWidth;
        this.height = container.clientHeight;

        this.initViewerContainer();
        this.initWidgetContainer();
    }

    /**
     * Creates a viewerContainer under the container that user passed in.
     * There are some benefits to create a new one. e.g., its style won't affect
     * the container div user passed in.
     */
    private initViewerContainer() {
        const container = this.container;
        if (!container) {
            return;
        }
        const div = document.createElement("div");
        div.classList.add("pano-viewer-container");
        div.style.cssText = `width: 100%; height: 100%; display: inline-block; position: relative; overflow: hidden;`;
        container.appendChild(div);
        this.viewerContainer = div;
    }

    /**
     * Creates a div for ui widget, if widget need position, just relative container, maybe remove later.
     */
    private initWidgetContainer() {
        const container = this.container;
        if (!container) {
            return;
        }
        const div = document.createElement("div");
        div.classList.add("pano-widget-container");
        container.appendChild(div);
        this.widgetContainer = div;
    }

    get needResize() {
        const isNeed = this.width !== this.container.clientWidth || this.height !== this.container.clientHeight;
        if (isNeed) {
            this.width = this.container.clientWidth;
            this.height = this.container.clientHeight;
        }
        return isNeed;
    }

    destroy() {
        if (this.widgetContainer) {
            this.widgetContainer.remove();
            this.widgetContainer = undefined;
        }
        if (this.viewerContainer) {
            this.viewerContainer.remove();
            this.viewerContainer = undefined;
        }

        this.container.remove();
    }
}
