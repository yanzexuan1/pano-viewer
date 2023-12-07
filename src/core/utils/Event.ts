// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Handler<T = any> = (val: T) => void;

/**
 * @internal
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
export class Event<Events extends Record<string, any> = {}> {
    private map: Map<string, Set<Handler>> = new Map();

    /**
     * @internal
     */
    addEventListener<EventName extends keyof Events>(name: EventName, handler: Handler<Events[EventName]>): void {
        let set: Set<Handler<Events[EventName]>> | undefined = this.map.get(name as string);
        if (!set) {
            set = new Set();
            this.map.set(name as string, set);
        }
        set.add(handler);
    }

    /**
     * @internal
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dispatchEvent<EventName extends keyof Events>(name: EventName, value: Events[EventName] = {} as any): void {
        const set: Set<Handler<Events[EventName]>> | undefined = this.map.get(name as string);
        if (!set) {
            return;
        }
        const copied = [...set];
        copied.forEach((fn) => fn(value));
    }

    /**
     * Checks if there is a listener
     * @internal
     */
    hasEventListener<EventName extends keyof Events>(name: EventName): boolean {
        return !!this.map.get(name as string);
    }

    /**
     * Removes all event listeners
     * @internal
     */
    removeEventListener(): void;

    /**
     * @internal
     */
    removeEventListener<EventName extends keyof Events>(name: EventName): void;

    /**
     * @internal
     */
    removeEventListener<EventName extends keyof Events>(name: EventName, handler: Handler<Events[EventName]>): void;

    /**
     * @internal
     */
    removeEventListener<EventName extends keyof Events>(name?: EventName, handler?: Handler<Events[EventName]>): void {
        if (!name) {
            this.map.clear();
            return;
        }

        if (!handler) {
            this.map.delete(name as string);
            return;
        }

        const handlers: Set<Handler<Events[EventName]>> | undefined = this.map.get(name as string);
        if (!handlers) {
            return;
        }
        handlers.delete(handler);
    }
}
