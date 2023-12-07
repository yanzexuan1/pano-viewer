import * as loglevel from "loglevel";

export const log = loglevel;

// log.setLevel("trace");
// log.setLevel("info");
if (DEBUG_MODE) {
    log.setLevel("debug");
} else {
    log.setLevel("warn");
}
// log.setLevel("error");
// log.setLevel("silent");

/**
 * Sets log level.
 * Note that, we limit user to set only some of the levels.
 */
export const setLogLevel = (level: string) => {
    try {
        log.setLevel(level as loglevel.LogLevelDesc);
    } catch (ex) {
        log.setLevel("error");
        log.error(ex);
    }
};
