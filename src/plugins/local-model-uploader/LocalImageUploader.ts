import { IUploader } from "./IUploader";
import type { PanoViewer, PanoViewpoint } from "src/core";
import { log } from "src/core/utils";

/**
 * @internal
 */
export class LocalImageUploader extends IUploader {
    viewer: PanoViewer;

    constructor(viewer: PanoViewer, elementId: string) {
        super(elementId);

        this.viewer = viewer;
    }

    protected formats(): string[] {
        return ["png", "jpg", "jpeg"];
    }

    protected uploadFiles(files: FileList) {
        const viewpoint: PanoViewpoint = {
            panoramas: [],
            id: "viewpoint_1",
            name: "",
            position: [0, 1, 0],
            initialDirection: [0, 0, 1],
        };

        if (files.length === 1) {
            const images = [];
            images.push(URL.createObjectURL(files[0]));
            viewpoint.panoramas.push({ id: "panorama_1", images });
            this.viewer.setViewpoints([viewpoint]);
            this.viewer.activatePanoramaById(viewpoint.id, viewpoint.panoramas[0].id);
        } else if (files.length === 6) {
            // for 6 images, image name must be named as right, left, up, down, front, back
            const tryFindAndCreateUrl = (searchNames: string[]): string => {
                let url = "";
                for (let i = 0; i < files.length; ++i) {
                    let fileName = files[i].name;
                    fileName = fileName.slice(0, fileName.indexOf("."));
                    fileName = fileName.toLowerCase();
                    let match = false;
                    for (let j = 0; j < searchNames.length; ++j) {
                        if (searchNames[j] === fileName) {
                            match = true;
                            break;
                        }
                    }
                    if (match) {
                        url = URL.createObjectURL(files[i]);
                        break;
                    }
                }
                return url;
            };

            // try to find corresponding images
            const right = tryFindAndCreateUrl(["right", "r", "pano_r"]);
            const left = tryFindAndCreateUrl(["left", "l", "pano_l"]);
            const up = tryFindAndCreateUrl(["up", "top", "u", "pano_u"]);
            const down = tryFindAndCreateUrl(["down", "bottom", "d", "pano_d"]);
            const front = tryFindAndCreateUrl(["front", "f", "pano_f"]);
            const back = tryFindAndCreateUrl(["back", "b", "pano_b"]);

            const images = [right, left, up, down, front, back];
            viewpoint.panoramas.push({ id: "panorama_1", images });
            this.viewer.setViewpoints([viewpoint]);
            this.viewer.activatePanoramaById(viewpoint.id, viewpoint.panoramas[0].id);
        } else {
            log.warn(`[Uploader] Expected 1 or 6 file, bug got ${files.length}!`);
        }
    }
}
