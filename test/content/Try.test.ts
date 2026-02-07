import {describe, expect, test} from "bun:test";
import {_try} from "../../src/content/IllustrationHandler.ts";

describe("_try", () => {
    test("returns value from successful function", () => {
        expect(_try(() => 42, () => -1)).toBe(42);
    });

    test("calls rejected handler on exception", () => {
        expect(_try(() => { throw new Error("boom"); }, (e) => `caught: ${e}`))
            .toBe("caught: Error: boom");
    });

    test("calls rejected handler when function returns undefined", () => {
        expect(_try(() => undefined, () => "was undefined")).toBe("was undefined");
    });

    test("passes error to rejected handler", () => {
        const error = new Error("test");
        _try(() => { throw error; }, (e) => {
            expect(e).toBe(error);
            return "ok";
        });
    });

    test("passes undefined to rejected handler when result is undefined", () => {
        _try(() => undefined, (e) => {
            expect(e).toBeUndefined();
            return "ok";
        });
    });
});
