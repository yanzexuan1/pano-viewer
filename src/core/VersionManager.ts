import { VERSION } from "../version";

const versionKey = "VERSION";

/**
 * Gets the sdk version ran on this device from local storage.
 */
export const getVersionFromLocalStorage = () => {
    return window.localStorage.getItem(versionKey);
};

/**
 * Sets the sdk version to local storage.
 */
export const setVersionToLocalStorage = () => {
    window.localStorage.setItem(versionKey, VERSION);
};

/**
 * Checks if current sdk version and last version are different.
 * There can be storage data formant change if sdk version is updated,
 * we may simply clean up local storage in this case.
 */
export const checkIsNewVersion = () => {
    const lastVersion = getVersionFromLocalStorage();
    if (lastVersion !== VERSION) {
        setVersionToLocalStorage();
        return true;
    }
    return false;
};
