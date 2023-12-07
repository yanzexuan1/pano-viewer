import { Event } from "../utils";

/**
 * Base plugin config.
 */
export interface PluginConfig {
    /**
     * ID for this Plugin, unique within its viewer.
     */
    id: string;
}

/**
 * Base plugin class.
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export abstract class Plugin<PluginEvents extends Record<string, unknown> = {}> extends Event<PluginEvents> {
    public readonly id: string; // plugin id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected viewer: any;

    /**
     * Creates this Plugin and installs it into the given {@link Viewer}.
     *
     * @param {string} id ID for this plugin, unique among all plugins in the viewer.
     * @param {Viewer} viewer The viewer.
     * @param {Object} [cfg] Options
     */
    constructor(viewer: any, cfg: PluginConfig) { // eslint-disable-line
        if (!cfg.id) {
            throw new Error("[Plugin] Missing plugin id!");
        }
        super();
        this.id = cfg.id;
        this.viewer = viewer;
        viewer.addPlugin(this);
    }

    /**
     * Destroys this Plugin and removes it from its viewer.
     */
    destroy() {
        this.viewer.removePlugin(this);
    }
}
