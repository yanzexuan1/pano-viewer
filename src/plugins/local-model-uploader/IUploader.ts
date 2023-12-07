import { log } from "src/core/utils";

/**
 * @internal
 */
export class IUploader {
    protected input: HTMLInputElement;

    constructor(elementId = "uploadModelFile") {
        this.input = document.createElement("input");
        this.input.id = elementId;
        this.input.type = "file";
        this.input.multiple = true;
        this.input.accept = this.formats().map((item) => "." + item).join(","); // eslint-disable-line
        this.input.style.display = "none"; // hide it by default
        this.input.onchange = (event: any) => { // eslint-disable-line
            const files = event.target.files;
            if (!files || files.length <= 0) {
                log.error("[Uploader] No files to be uploaded!");
                return;
            }
            this.uploadFiles(files);
        };
    }

    protected formats(): string[] {
        log.warn(`[Uploader]: Should call derived class instead!`);
        return [];
    }

    protected uploadFiles(files: FileList) {
        // let derived class to override this
        log.warn(`[Uploader]: Should call derived class instead! files: ${files}`);
    }

    public openFileBrowserToUpload() {
        this.input.click();
    }
}
