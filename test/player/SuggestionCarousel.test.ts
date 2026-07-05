import {describe, expect, test} from "bun:test";
import {fitWindow} from "../../src/player/SuggestionCarousel.ts";

describe('fitWindow', () => {
    test('all chips fit → end is the full length', () => {
        expect(fitWindow([50, 50, 50], 6, 200, 0)).toBe(3);
    });

    test('stops before a chip that would overflow', () => {
        // 50 + 6 + 50 = 106 fits in 110; adding +6+50 = 162 > 110
        expect(fitWindow([50, 50, 50], 6, 110, 0)).toBe(2);
    });

    test('always advances at least one chip even if it overflows', () => {
        expect(fitWindow([500], 6, 100, 0)).toBe(1);
    });

    test('respects a non-zero start offset', () => {
        expect(fitWindow([50, 50, 50, 50], 6, 110, 2)).toBe(4);
    });

    test('gap is only counted between chips, not before the first', () => {
        // from start=0: 100 fits exactly in 100 (no leading gap)
        expect(fitWindow([100, 100], 6, 100, 0)).toBe(1);
    });

    test('empty list yields the start index', () => {
        expect(fitWindow([], 6, 100, 0)).toBe(0);
    });
});
