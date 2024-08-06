import {describe, expect, test} from "bun:test";
import {parseHTML} from "linkedom";
import {ImageElement, ImageState} from "../../../src/client/components/ImageElement.ts";
import {StoppedClock} from "../../../src/system/clock.ts";
import {chain} from "../../../src/yadic/mod.ts";


describe("ImageElement", () => {
    const clock = new StoppedClock(new Date(1234567890));

    test("adds a state attribute that can be used for styling", async () => {
        const window = parseHTML('<body><img is="x-image" alt=""/></body>');
        ImageElement.definition(chain({clock}, window)).apply(window.customElements);

        const element = window.document.querySelector<HTMLImageElement>('img[is=x-image]')!;

        expect(element.getAttribute('state')).toEqual(ImageState.Loading);
    });

    test("when reloadable is true, clicking on the image while holding down the ctrl key will cause it to reload", async () => {
        const window = parseHTML('<body><img is="x-image" alt="" reloadable src="/art"/></body>');
        ImageElement.definition(chain({clock}, window)).apply(window.customElements);

        const element = window.document.querySelector<HTMLImageElement>('img[is=x-image]')!;
        // Currently this is done by a generic event lister in the main.ts file
        window.document.body.classList.add('ctrl');
        element.click();

        expect(element.src).toEqual('/art?reload=1234567890');
    });

    test('when reloading state is also updated', async () => {
       // Not possible with linkedom so manual test
    });
})
