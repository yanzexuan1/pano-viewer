import { CoordinateUtils, Event } from "src/core/utils";

type NativeEvent = UIEvent | MouseEvent | PointerEvent | WheelEvent | KeyboardEvent;

export interface IUIEvent {
    readonly type: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly target: any;
    readonly preventDefault: () => void;
}

export interface IMouseEvent extends IUIEvent {
    readonly altKey: boolean;
    readonly ctrlKey: boolean;
    readonly shiftKey: boolean;
    readonly button: number;
    readonly clientX: number;
    readonly clientY: number;
    readonly pageX: number;
    readonly pageY: number;
    readonly x: number;
    readonly y: number;
    readonly timestamp: number;
}

export interface IPointerEvent extends IMouseEvent {
    readonly pointerId: number;
    readonly pointerType: string;
}

export interface IWheelEvent extends IMouseEvent {
    readonly deltaMode: number;
    readonly deltaX: number;
    readonly deltaY: number;
    readonly deltaZ: number;
}

export interface IKeyboardEvent extends IUIEvent {
    readonly altKey: boolean;
    readonly ctrlKey: boolean;
    readonly shiftKey: boolean;
    readonly key: string;
    readonly code: string;
}

export enum MouseButton {
    /** Left Click or Touch */
    Left = 0,
    /** Middle Click */
    Middle = 1,
    /** Right Click */
    Right = 2,
    /** Browser Back */
    Back = 3,
    /** Browser Forward */
    Forward = 4,
}

type MouseButtonType = MouseButton /* | MouseButtons*/;

/**
 * Event info.
 */
export interface EventInfo {
    x: number; // The X coordinate of the mouse pointer in local (DOM content) coordinates.
    y: number; // The Y coordinate of the mouse pointer in local (DOM content) coordinates.
    pageX: number; // The X coordinate of the mouse pointer relative to the whole document.
    pageY: number; // The Y coordinate of the mouse pointer relative to the whole document.
    clientX: number;
    clientY: number;
    deltaMode: number;
    deltaX: number; // wheel detla Returns a double representing the vertical scroll amount.
    deltaY: number;
    movementX: number;
    movementY: number;
    code?: string;
    pointerId: number;
    pointers?: EventInfo[];
    button?: MouseButtonType;
    buttons: MouseButtonType;
    pointerType: string;
    altKey: boolean;
    ctrlKey: boolean;
    shiftKey: boolean;
    metaKey: boolean;
    timestamp: number;
    originalEvent?: NativeEvent; // just for native event
}

/**
 * Input events.
 */
export type InputEvents = {
    pointerdown: EventInfo;
    pointermove: EventInfo;
    pointerup: EventInfo;
    pointercancel: EventInfo;
    pointerenter: EventInfo;
    pointerleave: EventInfo;
    wheel: EventInfo;
    click: EventInfo;
    dblclick: EventInfo;
    contextmenu: EventInfo;

    mousedown: EventInfo;
    mousemove: EventInfo;
    mouseup: EventInfo;

    touchstart: EventInfo;
    touchmove: EventInfo;
    touchend: EventInfo;

    keydown: EventInfo;
    keyup: EventInfo;
    resize: EventInfo;
};

export class InputManager extends Event<InputEvents> {
    private element: HTMLElement;
    private enabled = true;
    private keyboardEnabled = true;

    protected mouseDownPositionX = 0;
    protected mouseDownPositionY = 0;
    protected lastLeftPointerUpTime = 0;

    // Global vars to cache event state,judge for finger number
    private pointers: EventInfo[] = [];

    constructor(element: HTMLElement) {
        super();
        this.element = element;

        this.bindEvents();
    }

    getEnabled(): boolean {
        return this.enabled;
    }

    setEnabled(enable: boolean) {
        this.enabled = enable;
    }

    getkKeyboardEnabled(): boolean {
        return this.keyboardEnabled;
    }

    setkKeyboardEnabled(enable: boolean) {
        this.keyboardEnabled = enable;
    }

    // TODO:
    setCursor(cursorStyle: string) {
        this.element.style && (this.element.style.cursor = cursorStyle || "default");
    }

    bindEvents() {
        this.element.style.touchAction = "none";
        this.element.style.userSelect = "none";
        this.element.style.webkitUserSelect = "none";

        this.element.addEventListener("click", this.handleClick);
        this.element.addEventListener("pointerdown", this.handlePointerDown);
        this.element.addEventListener("pointermove", this.handlePointerMove);
        this.element.addEventListener("pointerup", this.handlePointerUp);
        this.element.addEventListener("pointercancel", this.handlePointerCancel);
        this.element.addEventListener("pointerenter", this.handlePointerEnter);
        this.element.addEventListener("pointerleave", this.handlePointerLeave);
        this.element.addEventListener("contextmenu", this.handleContextMenu);

        this.element.addEventListener("wheel", this.handleMouseWheel);

        window.addEventListener("resize", this.handleResize);

        window.addEventListener("keydown", this.handleKeydown);
        window.addEventListener("keyup", this.handleKeyup);
    }

    private handleClick = (event: MouseEvent) => {
        if (!this.enabled) {
            return;
        }

        // this.stop(event);
        const baseEvent = this.getBaseEvent(event);
        this.dispatchEvent("click", baseEvent);
    };

    private handlePointerDown = (event: PointerEvent) => {
        if (!this.enabled) {
            return;
        }

        this.stop(event);
        const baseEvent = this.getBaseEvent(event);

        if (this.isDoubleClick(baseEvent)) {
            // reset it to prevent the next click to be detected as a double click
            this.lastLeftPointerUpTime = 0;
            this.mouseDownPositionX = -1;
            this.mouseDownPositionY = -1;
            this.dispatchEvent("dblclick", baseEvent);
        } else {
            this.mouseDownPositionX = baseEvent.x;
            this.mouseDownPositionY = baseEvent.y;
        }
        this.dispatchEvent("pointerdown", baseEvent);
        if (event.pointerType === "touch") {
            this.pointers.push(baseEvent);
            baseEvent.pointers = this.pointers;

            this.dispatchEvent("touchstart", baseEvent);
        } else {
            this.dispatchEvent("mousedown", baseEvent);
        }
    };

    private handlePointerMove = (event: PointerEvent) => {
        if (!this.enabled) {
            return;
        }

        this.stop(event);
        const baseEvent = this.getBaseEvent(event);
        if (!this.isCloseToLastPosition(baseEvent)) {
            this.dispatchEvent("pointermove", baseEvent);
            if (event.pointerType === "touch") {
                this.updatePointers(baseEvent);
                baseEvent.pointers = this.pointers;

                this.dispatchEvent("touchmove", baseEvent);
            } else {
                this.dispatchEvent("mousemove", baseEvent);
            }
        }
    };

    private handlePointerUp = (event: PointerEvent) => {
        if (!this.enabled) {
            return;
        }

        this.stop(event);
        const baseEvent = this.getBaseEvent(event);
        if (baseEvent.button === MouseButton.Left) {
            this.lastLeftPointerUpTime = baseEvent.timestamp;
        }
        this.dispatchEvent("pointerup", baseEvent);
        if (event.pointerType === "touch") {
            this.removePointers(baseEvent);
            baseEvent.pointers = this.pointers;

            this.dispatchEvent("touchend", baseEvent);
        } else {
            this.dispatchEvent("mouseup", baseEvent);
        }
    };

    private handlePointerCancel = (event: PointerEvent) => {
        if (!this.enabled) {
            return;
        }

        this.stop(event);
        this.dispatchEvent("pointercancel", this.getBaseEvent(event));
    };

    private handleMouseWheel = (event: WheelEvent) => {
        if (!this.enabled) {
            return;
        }

        this.stop(event);
        this.dispatchEvent("wheel", this.getBaseEvent(event));
    };

    private handleContextMenu = (event: MouseEvent) => {
        if (!this.enabled) {
            return;
        }

        this.stop(event);
        this.dispatchEvent("contextmenu", this.getBaseEvent(event));
        return false;
    };

    private handlePointerEnter = (event: PointerEvent) => {
        if (!this.enabled) {
            return;
        }

        this.stop(event);
        this.dispatchEvent("pointerenter", this.getBaseEvent(event));
    };

    private handlePointerLeave = (event: PointerEvent) => {
        if (!this.enabled) {
            return;
        }

        this.stop(event);
        this.dispatchEvent("pointerleave", this.getBaseEvent(event));
    };

    private handleResize = (event: UIEvent) => {
        if (!this.enabled) {
            return;
        }

        this.stop(event);
        this.dispatchEvent("resize", this.getBaseEvent(event));
    };

    private handleKeydown = (event: KeyboardEvent) => {
        if (!this.enabled || !this.keyboardEnabled) {
            return;
        }

        // this.stop(event);
        this.dispatchEvent("keydown", this.getBaseEvent(event));
    };

    private handleKeyup = (event: KeyboardEvent) => {
        if (!this.enabled || !this.keyboardEnabled) {
            return;
        }

        // this.stop(event);
        this.dispatchEvent("keyup", this.getBaseEvent(event));
    };

    unBindEvents() {
        this.element.removeEventListener("pointerdown", this.handlePointerDown);
        this.element.removeEventListener("pointermove", this.handlePointerMove);
        this.element.removeEventListener("pointerup", this.handlePointerUp);
        this.element.removeEventListener("pointerenter", this.handlePointerEnter);
        this.element.removeEventListener("pointerleave", this.handlePointerLeave);
        this.element.removeEventListener("contextmenu", this.handleContextMenu);

        this.element.removeEventListener("wheel", this.handleMouseWheel);

        window.removeEventListener("resize", this.handleResize);
        window.removeEventListener("keydown", this.handleKeydown);
        window.removeEventListener("keyup", this.handleKeyup);

        this.element.style.touchAction = "";
        this.element.style.userSelect = "";
        this.element.style.webkitUserSelect = "";
    }

    private getBaseEvent(event: NativeEvent) {
        const baseEvent: EventInfo = {
            x: 0,
            y: 0,
            pageX: 0,
            pageY: 0,
            clientX: 0,
            clientY: 0,
            deltaX: 0,
            deltaY: 0,
            movementX: 0,
            movementY: 0,
            deltaMode: 0,
            pointerId: 0,
            timestamp: 0,
            buttons: 0,
            pointerType: "mouse",
            altKey: false,
            ctrlKey: false,
            shiftKey: false,
            metaKey: false,
            originalEvent: event,
        };
        baseEvent.timestamp = event.timeStamp;
        if (isOfType<IMouseEvent>(event, "clientX")) {
            baseEvent.altKey = event.altKey;
            baseEvent.ctrlKey = event.ctrlKey;
            baseEvent.shiftKey = event.shiftKey;
            baseEvent.clientX = event.clientX;
            baseEvent.clientY = event.clientY;
            baseEvent.button = event.button;
            if (isOfType<IPointerEvent>(event, "pointerId")) {
                baseEvent.pointerType = event.pointerType;
                baseEvent.buttons = event.buttons;
                baseEvent.pageX = event.pageX;
                baseEvent.pageY = event.pageY;
                baseEvent.pointerId = event.pointerId;
                const screenCoord = CoordinateUtils.getScreenCoordinateByEvent(event, this.element);
                baseEvent.x = screenCoord.x;
                baseEvent.y = screenCoord.y;
                // baseEvent.x = event.x;
                // baseEvent.y = event.y;
                baseEvent.movementX = event.movementX;
                baseEvent.movementY = event.movementY;
            } else if (isOfType<IWheelEvent>(event, "deltaX")) {
                baseEvent.deltaMode = event.deltaMode;
                baseEvent.deltaX = event.deltaX;
                baseEvent.deltaY = event.deltaY;
            }
        } else if (isOfType<IKeyboardEvent>(event, "code")) {
            baseEvent.altKey = event.altKey;
            baseEvent.ctrlKey = event.ctrlKey;
            baseEvent.shiftKey = event.shiftKey;
            baseEvent.metaKey = event.metaKey;
            baseEvent.code = event.code;
        }
        return baseEvent;
    }

    private stop(e: NativeEvent) {
        e.preventDefault();
        // e.stopPropagation();
    }

    private updatePointers(ev: EventInfo) {
        for (let i = 0; i < this.pointers.length; i++) {
            if (ev.pointerId == this.pointers[i].pointerId) {
                this.pointers[i] = ev;
                break;
            }
        }
    }

    private removePointers(ev: EventInfo) {
        // Remove this event from the target's cache
        for (let i = 0; i < this.pointers.length; i++) {
            if (this.pointers[i].pointerId == ev.pointerId) {
                this.pointers.splice(i, 1);
                break;
            }
        }
    }

    // just for compatible camera control
    style = {};
    getBoundingClientRect() {
        return this.element.getBoundingClientRect();
    }

    /**
     * Checks if user clicked on last position, this is used to detect a dblclick event.
     */
    private isCloseToLastPosition(e: EventInfo): boolean {
        const TOLERANCE = 5; // in pixel
        if (this.mouseDownPositionX === -1 || this.mouseDownPositionY === -1) {
            return false;
        }
        return Math.abs(e.x - this.mouseDownPositionX) < TOLERANCE && Math.abs(e.y - this.mouseDownPositionY) < TOLERANCE;
    }

    /**
     * Checks if a dblclick event happen.
     */
    private isDoubleClick(e: EventInfo): boolean {
        const DELTA = 300; // in ms
        const delta = e.timestamp - this.lastLeftPointerUpTime;
        if (e.button === MouseButton.Left && delta < DELTA) {
            if (this.isCloseToLastPosition(e)) {
                return true;
            }
        }
        return false;
    }
}

function isOfType<T>(varToBeChecked: unknown, propertyToCheckFor: keyof T): varToBeChecked is T {
    return (varToBeChecked as T)[propertyToCheckFor] !== undefined;
}
