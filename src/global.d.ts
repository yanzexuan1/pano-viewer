interface Document {
    mozCancelFullscreen(): void;
    webkitExitFullscreen(): void;
    msExitFullscreen(): void;
    mozFullScreenElement: Element | null;
}

interface HTMLElement {
    mozRequestFullScreen(): void;
    webkitRequestFullscreen(): void;
    msRequestFullscreen(): void;
}

declare let DEBUG_MODE: boolean;
declare const __VERSION__: string;
