import {describe, expect, test} from "bun:test";
import {Arrays} from "../../src/system/Arrays.ts";

describe("Arrays", () => {
    describe("unique", () => {
        test("removes duplicates", () => {
            expect(Arrays.unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
        });

        test("preserves order of first occurrence", () => {
            expect(Arrays.unique(["b", "a", "b", "c", "a"])).toEqual(["b", "a", "c"]);
        });

        test("returns empty array for empty input", () => {
            expect(Arrays.unique([])).toEqual([]);
        });
    });

    describe("shuffle", () => {
        test("returns same elements", () => {
            const input = [1, 2, 3, 4, 5];
            const result = Arrays.shuffle(input);
            expect(result.sort()).toEqual([1, 2, 3, 4, 5]);
        });

        test("does not mutate original array", () => {
            const input = [1, 2, 3];
            Arrays.shuffle(input);
            expect(input).toEqual([1, 2, 3]);
        });

        test("returns empty array for empty input", () => {
            expect(Arrays.shuffle([])).toEqual([]);
        });
    });

    describe("zip", () => {
        test("zips two arrays of equal length", () => {
            const result: any = Arrays.zip([1, 2, 3], [4, 5, 6]);
            expect(result).toEqual([[1, 4], [2, 5], [3, 6]]);
        });

        test("truncates to shortest array", () => {
            const result: any = Arrays.zip([1, 2], [4, 5, 6]);
            expect(result).toEqual([[1, 4], [2, 5]]);
        });

        test("returns empty array when no arrays provided", () => {
            expect(Arrays.zip()).toEqual([]);
        });

        test("returns empty array when any input is empty", () => {
            expect(Arrays.zip([1, 2], [])).toEqual([]);
        });
    });
});
