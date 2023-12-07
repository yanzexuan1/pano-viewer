import * as THREE from "three";

import type { EventInfo, IPointerEvent } from "src/core/input-manager/InputManager";

/**
 * @internal
 * Some concepts:
 *
 * 1. Screen coordinate:
 * (0, 0)
 * ----------------------> x
 * |                   |
 * |                   |
 * |                   |
 * |                   |
 * |___________________|
 * y                   (1024, 768) e.g.
 *
 * 2. Normalized screen coordinate:
 * (0, 0)
 * ----------------------> x
 * |                   |
 * |                   |
 * |                   |
 * |                   |
 * |___________________|
 * y                   (1, 1)
 *
 * 3. NDC: Normalized Device Coordinates
 *             ^ y       (1, 1)
 *             |
 * (-1, 0)     |(0, 0)   (1, 0)
 * ----------------------> x
 *             |
 *             |
 * (-1, -1)
 *
 * 4. World Coordinates
 *      ^ y
 *      |
 *      |     / x
 *      |   /
 *      | /
 * ---------------> z
 *   (0, 0)
 */
export class CoordinateUtils {
    /**
     * Gets screen coordinate by pointer event.
     */
    public static getScreenCoordinateByEvent(event: IPointerEvent | EventInfo | MouseEvent | PointerEvent, container: HTMLElement) {
        const screenCoord = new THREE.Vector2();
        const { left, top } = container.getBoundingClientRect();
        screenCoord.x = event.clientX - left;
        screenCoord.y = event.clientY - top;
        return screenCoord;
    }

    /**
     * Converts screen point to NDC coordinate.
     * @description {en} Normalized screen coordinate: bottom-left(-1, -1), top-right(1, 1).
     * @description {zh} 标准化屏幕坐标：左下角(-1, -1), 右上角(1, 1)。
     * @description {en} World coordinate to normalized screen coordinate(0-1).
     * @description {zh} 世界坐标转标准化屏幕坐标（0-1）。
     */
    public static screen2Ndc(vector: THREE.Vector2, camera: THREE.Camera, container: HTMLElement) {
        const { clientWidth: w, clientHeight: h } = container;
        const ndcVec = new THREE.Vector2();
        ndcVec.x = (vector.x / w) * 2 - 1;
        ndcVec.y = -(vector.y / h) * 2 + 1;
        return ndcVec;
    }
}
