import {test, expect, describe} from "bun:test";
import {HttpGameFinder} from "../src/HttpGameFinder.ts";
import {client} from "../src/http.ts";


describe("HttpGameFinder", () => {
    test("Finder", async () => {
        const finder = new HttpGameFinder(client);
        const result = await finder.find("Adventure");
        expect(result).toBeArray();
    });
})
