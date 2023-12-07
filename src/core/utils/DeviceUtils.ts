import { log } from "./LogUtils";

/**
 * Device util class
 * @internal
 */
export class DeviceUtils {
    /**
     * Checks if it is opened in touch screen device, like iphone, ipad, etc.
     */
    static isTouchScreenDevice(): boolean {
        return !!("ontouchstart" in window);
    }

    static printDeviceInfo() {
        const ua = navigator.userAgent;
        const isAndroid = /(?:Android)/.test(ua);
        const isFireFox = /(?:Firefox)/.test(ua);
        const isChrome = /(?:Chrome|CriOS)/.test(ua);
        const isTablet = /(?:iPad|PlayBook)/.test(ua) || (isAndroid && !/(?:Mobile)/.test(ua)) || (isFireFox && /(?:Tablet)/.test(ua));
        const isiPhone = /(?:iPhone)/.test(ua) && !isTablet;
        const isPc = !isiPhone && !isAndroid;
        const isTouchDevice = DeviceUtils.isTouchScreenDevice();
        if (isAndroid) {
            log.debug("[DI] is android");
        }
        if (isFireFox) {
            log.debug("[DI] is fireFox");
        }
        if (isChrome) {
            log.debug("[DI] is chrome");
        }
        if (isTablet) {
            log.debug("[DI] is tablet");
        }
        if (isiPhone) {
            log.debug("[DI] is iPhone");
        }
        if (isPc) {
            log.debug("[DI] is PC");
        }
        if (isTouchDevice) {
            log.debug("[DI] is touch device");
        }
    }

    static isMobile = /mobile/i.test(navigator.userAgent);

    // react native has window
    static isBrowser = typeof document !== "undefined";

    static isNode = typeof process !== "undefined" && Object.prototype.toString.call(process) === "[object process]";
}
