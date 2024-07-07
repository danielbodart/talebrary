import {describe, expect, test} from "bun:test";
import {parseHTML} from "linkedom";
import {ImageElement, ImageState} from "../../../src/client/components/ImageElement.ts";
import * as elements from "typed-html";
import {StoppedClock} from "../../../src/system/clock.ts";
import {chain} from "../../../src/yadic/mod.ts";


describe("ImageElement", () => {
    const clock = new StoppedClock(new Date(1234567890));

    test("adds a state attribute that can be used for styling", async () => {
        const window = parseHTML(<body><img is="x-image" alt=""/></body>);
        ImageElement.definition(chain({clock}, window)).apply(window.customElements);

        const element = window.document.querySelector<HTMLImageElement>('img[is=x-image]')!;

        expect(element.getAttribute('state')).toEqual(ImageState.Loading);
    });

    test("when reloadable is true, clicking on the image will cause it to reload", async () => {
        const window = parseHTML(<body><img is="x-image" alt="" reloadable src="/art"/></body>);
        ImageElement.definition(chain({clock}, window)).apply(window.customElements);

        const element = window.document.querySelector<HTMLImageElement>('img[is=x-image]')!;
        element.click();

        expect(element.src).toEqual('/art?reload=1234567890')
    });
})
