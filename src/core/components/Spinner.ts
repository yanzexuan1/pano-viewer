import type { Container } from "./Container";
import { log } from "src/core/utils";

export class Spinner {
    private element: HTMLDivElement;

    jobCount = 0;

    constructor(container: Container) {
        const spinner = document.createElement("div");
        spinner.classList.add("pano-spinner");
        spinner.appendChild(document.createElement("span"));
        spinner.appendChild(document.createElement("span"));
        spinner.appendChild(document.createElement("span"));
        spinner.appendChild(document.createElement("span"));

        container.viewerContainer?.appendChild(spinner);
        this.element = spinner;

        this.setSpinnerVisibility(this.jobCount > 0); // update its status once initialized
    }

    /**
     * Sets spinner visibility
     */
    private setSpinnerVisibility(visible: boolean) {
        if (visible) {
            this.element.classList.remove("hidden");
        } else {
            this.element.classList.add("hidden");
        }
    }

    increaseJobCount() {
        this.setSpinnerVisibility(++this.jobCount > 0);
    }

    decreaseJobCount() {
        if (this.jobCount <= 0) {
            // When code reach here, there must be some logic error. decreaseJobCount() should be called
            // exactly the same times as increaseJobCount().
            log.warn("[Viewer] jobCount should be at least 1 here!");
            return;
        }
        this.setSpinnerVisibility(--this.jobCount > 0);
    }

    destroy() {
        this.element.remove();
        this.jobCount = 0;
    }
}
