import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";

export class CSS2DObjectUtils {
    /**
     * Creates CSS2DObject with HTMLElement
     */
    static createCSS2DObject(element: HTMLElement) {
        const obj = new CSS2DObject(element);
        // add user data, so we know the div belongs to which CSS2DObject
        element.dataset.objectId = obj.id.toString();
        return obj;
    }

    static createDefaultHotpoint(size = 12): CSS2DObject {
        const div = document.createElement("div");
        const style = div.style;
        style.width = `${size}px`;
        style.height = `${size}px`;
        style.opacity = "0.8";
        style.cursor = "pointer";
        style.top = `${-size / 2}px`;
        style.left = `${-size / 2}px`;
        style.backgroundColor = "#ffffff";
        style.border = "2px solid #00DAB7";
        style.borderRadius = "50%";
        // style.backgroundImage = "url('images/hotpoint.png')";
        // style.backgroundPositionX = "50%";
        // style.backgroundSize = "cover";
        // style.backgroundColor = "#f00a";

        return this.createCSS2DObject(div);
    }

    static createHotpoint(html?: string): CSS2DObject {
        if (html) {
            const div = document.createElement("div");
            const style = div.style;
            style.top = "0px";
            style.left = "0px";
            div.innerHTML = html;
            return this.createCSS2DObject(div);
        }
        return this.createDefaultHotpoint();
    }

    static createLabel(label: string, cssClass = ""): CSS2DObject {
        const div = document.createElement("div");
        div.innerHTML = label;
        if (cssClass) {
            div.classList.add(cssClass);
        } else {
            const style = div.style;
            style.padding = "5px 9px";
            style.color = "#ffffffdd";
            style.fontSize = "12px";
            style.position = "absolute";
            style.backgroundColor = "rgba(0, 0, 0, 0.3)";
            style.borderRadius = "12px";
            style.cursor = "pointer";
            style.top = "0px";
            style.left = "0px";
            // style.pointerEvents = 'none' // avoid html element to affect mouse event of the scene
        }
        return this.createCSS2DObject(div);
    }

    /**
     * Recursively find "dataset.objectId" of a HTMLElement
     */
    static tryFindObjectId(element: HTMLElement): number | undefined {
        // if not null or undefined, then it is a hotpoint
        if (element.dataset.objectId != null) {
            return parseInt(element.dataset.objectId);
        }
        // check parent
        const p = element.parentElement;
        if (p && !(p instanceof HTMLBodyElement)) {
            return this.tryFindObjectId(p);
        }
        return undefined;
    }
}
