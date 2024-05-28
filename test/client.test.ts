import {describe, test} from "bun:test";
import {client} from "../src/client";
import {fileHandler} from "../src/local/FileHandler.ts";

describe("client", () => {
    test.skip("can load an story", async () => {
        await client(`file://${import.meta.dir}/../Floatpoint.gblorb`, "blorb/glulx", `file://${import.meta.dir}/../www`, fileHandler)
    });
})
