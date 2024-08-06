import {describe, expect, it} from "bun:test";
import {parseHTML} from "linkedom";
import {Elements} from "./elements.ts";

describe("Linkedom.JSX", () => {
    it("can load an story", async () => {
        const {document} = parseHTML('<html></html>');
        const elements = new Elements({document})
        const d:any = <div class="Foo">
            <input/>
            Test
        </div>;
        document.body.append(d);
        expect(d.tagName).toBe("DIV");
        expect(document.toString()).toEqual('<html><head></head><body><div class="Foo"><input>Test</div></body></html>');
    });
});