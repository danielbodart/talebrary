import {describe, expect, test} from "bun:test";
import {Engine} from "@bodar/text-engine";
import {athenaeumDisk, cataloguePaths, type RoomMeta} from "./athenaeumDisk.ts";
import {resolveRoom} from "./CatalogueConfig.ts";

describe("athenaeumDisk", () => {
    test("starts in the atrium with the librarian and pocket junk", () => {
        const view = new Engine(athenaeumDisk).peek();
        expect(view.roomId).toBe("/");
        expect(view.title).toBe("The Atrium");
        expect(view.characters).toContain("librarian");
        expect(view.inventory).toEqual(["fluff", "button", "sweet"]);
    });

    test("exits mirror the catalogue router", () => {
        const engine = new Engine(athenaeumDisk);
        for (const path of cataloguePaths()) {
            engine.reset();
            // navigate to the path by replaying its segments is overkill; assert via resolveRoom parity instead
            const expected = resolveRoom(path)!;
            const room = expected.exits.map((e) => ({label: e.label, roomId: e.path}));
            // build the engine view for that room by entering it directly through history
            const disk = athenaeumDisk();
            disk.roomId = path;
            const v = new Engine(() => disk).peek();
            expect(v.exits).toEqual(room);
        }
    });

    test("navigating the atrium into the genres wing works", () => {
        const engine = new Engine(athenaeumDisk);
        const view = engine.execute("go genres");
        expect(view.roomId).toBe("/genres");
        expect(view.title).toBe("Genre Wings");
        expect(view.suggestions.go).toContain("fantasy");
        expect(view.suggestions.go).toContain("back");
    });

    test("category rooms carry a gameQuery in meta", () => {
        const engine = new Engine(athenaeumDisk);
        engine.execute("go genres");
        const view = engine.execute("go fantasy");
        expect(view.roomId).toBe("/genres/fantasy");
        expect((view.meta as unknown as RoomMeta).gameQuery).toEqual({type: "genre", genre: "Fantasy"});
    });

    test("talking to the librarian surfaces the collection topics", () => {
        const engine = new Engine(athenaeumDisk);
        const view = engine.execute("talk librarian");
        const keywords = view.conversation?.topics.map((t) => t.keyword) ?? [];
        expect(keywords).toEqual(["athenaeum", "illustrations", "collection"]);
        expect(view.suggestions.discuss).toContain("athenaeum");
    });

    test("discussing a topic returns the librarian's response", () => {
        const engine = new Engine(athenaeumDisk);
        engine.execute("talk librarian");
        const view = engine.execute("discuss athenaeum");
        expect(view.messages.join(" ")).toContain("Athenaeum is no ordinary library");
    });

    test("the atrium illustration is available for rendering", () => {
        const view = new Engine(athenaeumDisk).peek();
        const meta = view.meta as unknown as RoomMeta;
        expect(meta.illustration.title).toBe("The Atrium");
    });
});
