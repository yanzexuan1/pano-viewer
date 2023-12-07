import * as THREE from "three";

/**
 * @internal
 */
export class CommonUtils {
    /**
     * Checks full screen mode
     */
    static isFullScreen() {
        const element = document.fullscreenElement || document.mozFullScreenElement;
        return element ? true : false;
    }

    /**
     * Enters full screen mode
     */
    static fullScreen(element: HTMLElement = document.documentElement) {
        const func = element.requestFullscreen || element.mozRequestFullScreen || element.webkitRequestFullscreen || element.msRequestFullscreen;
        func.call(element);
    }

    /**
     * Exits full screen mode
     */
    static exitFullscreen() {
        const func = document.exitFullscreen || document.mozCancelFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
        func.call(document);
    }

    /**
     * Converts a number to a string with proper fraction digits
     */
    static numberToString(num: number): string {
        let fractionDigits = 2;
        if (Math.abs(num) < 0.000001) {
            fractionDigits = 2; // too small! take it as 0
        } else if (Math.abs(num) < 0.00001) {
            fractionDigits = 7;
        } else if (Math.abs(num) < 0.0001) {
            fractionDigits = 6;
        } else if (Math.abs(num) < 0.001) {
            fractionDigits = 5;
        } else if (Math.abs(num) < 0.01) {
            fractionDigits = 4;
        } else if (Math.abs(num) < 0.1) {
            fractionDigits = 3;
        }
        return num.toFixed(fractionDigits);
    }

    /**
     * Converts vector to a string with proper fraction digits
     */
    static vectorToString(vec: THREE.Vector2 | THREE.Vector3 | number[]): string {
        if (Array.isArray(vec)) {
            return `(${this.numberToString(vec[0])}, ${this.numberToString(vec[1])}, ${this.numberToString(vec[2])})`;
        }
        if (vec instanceof THREE.Vector3) {
            return `(${this.numberToString(vec.x)}, ${this.numberToString(vec.y)}, ${this.numberToString(vec.z)})`;
        }
        return `(${this.numberToString(vec.x)}, ${this.numberToString(vec.y)})`;
    }

    static isVectorValid(vec: THREE.Vector2 | THREE.Vector3): boolean {
        let valid = vec && !isNaN(vec.x) && !isNaN(vec.y) && isFinite(vec.x) && isFinite(vec.y);
        if (valid && vec instanceof THREE.Vector3) {
            valid = !isNaN(vec.z) && isFinite(vec.z);
        }
        return valid;
    }
}
