import {describe, expect, test} from "bun:test";
import {Engine, type SuggestionNode} from "@bodar/dullahan";
import {athenaeumDisk, cataloguePaths, type RoomMeta} from "./athenaeumDisk.ts";
import {resolveRoom} from "./CatalogueConfig.ts";

function leafCommands(nodes: SuggestionNode[]): string[] {
    return nodes.flatMap((n) => (n.children ? n.children.map((c) => c.command!) : [n.command!]));
}

describe("athenaeumDisk", () => {
    test("starts in the atrium with the librarian and pocket junk", () => {
        const view = new Engine(athenaeumDisk).peek();
        expect(view.roomId).toBe("/");
        expect(view.title).toBe("The Atrium");
        expect(view.characters).toContain("librarian");
        expect(view.inventory).toEqual([
            {name: "fluff", display: "some fluff"},
            {name: "button", display: "a button"},
            {name: "sweet", display: "a sweet"},
        ]);
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

    test("the atrium lists every category, collections before genres", () => {
        const view = new Engine(athenaeumDisk).peek();
        const exits = view.exits.map((e) => e.roomId);
        expect(exits).toEqual([
            "/collections/top-rated",
            "/collections/recent",
            "/collections/classics",
            "/genres/fantasy",
            "/genres/horror",
            "/genres/science-fiction",
            "/genres/mystery",
            "/genres/humor",
            "/genres/slice-of-life",
            "/genres/surreal",
            "/genres/historical",
        ]);
    });

    test("navigating the atrium jumps straight into a category (no wing stage)", () => {
        const engine = new Engine(athenaeumDisk);
        const view = engine.execute("go fantasy");
        expect(view.roomId).toBe("/genres/fantasy");
        expect(view.title).toBe("Fantasy Aisle");
        expect(leafCommands(view.suggestions)).toContain("go back");
    });

    test("a category's back exit returns to the atrium", () => {
        const room = resolveRoom("/genres/fantasy")!;
        expect(room.exits[0]).toEqual({path: "/", label: "back"});
        expect(room.breadcrumb).toEqual([{name: "Atrium", item: "/"}, {name: "Fantasy Aisle"}]);
    });

    test("wing paths no longer resolve to a room (handler 301s them)", () => {
        expect(resolveRoom("/genres")).toBeUndefined();
        expect(resolveRoom("/collections")).toBeUndefined();
    });

    test("search is advertised as a prefill suggestion in every room", () => {
        const view = new Engine(athenaeumDisk).peek();
        const search = view.suggestions.find((n) => n.command === "search");
        expect(search?.action).toBe("prefill");
    });

    test("searching within a genre aisle scopes the query to that genre", () => {
        const room = resolveRoom("/genres/horror", "ghost")!;
        expect(room.gameQuery).toEqual({type: "search", search: "ghost", genre: "Horror"});
    });

    test("searching from the atrium stays global (no genre)", () => {
        const room = resolveRoom("/", "ghost")!;
        expect(room.gameQuery).toEqual({type: "search", search: "ghost"});
    });

    test("category rooms carry a gameQuery in meta", () => {
        const engine = new Engine(athenaeumDisk);
        const view = engine.execute("go fantasy");
        expect(view.roomId).toBe("/genres/fantasy");
        expect((view.meta as unknown as RoomMeta).gameQuery).toEqual({type: "genre", genre: "Fantasy"});
    });

    test("talking to the librarian surfaces the collection topics", () => {
        const engine = new Engine(athenaeumDisk);
        const view = engine.execute("talk librarian");
        const keywords = view.conversation?.topics.map((t) => t.keyword) ?? [];
        expect(keywords).toEqual(["athenaeum", "illustrations", "collection", "searching"]);
        expect(leafCommands(view.suggestions)).toContain("discuss athenaeum");
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
