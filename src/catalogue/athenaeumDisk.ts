import type {Disk, Room, Topic} from "@bodar/text-engine";
import type {BreadcrumbItem, GameQuery, Room as CatalogueRoom} from "./CatalogueConfig.ts";
import {CATALOGUE, resolveRoom} from "./CatalogueConfig.ts";
import {librarianTopics} from "./Librarian.ts";
import type {Describable} from "../types.ts";

/** Consumer metadata attached to every engine room, passed through to the view. */
export interface RoomMeta {
    illustration: Describable;
    breadcrumb: BreadcrumbItem[];
    gameQuery?: GameQuery;
    pageTitle: string;
}

/** Every navigable path in the catalogue, in depth-first order (atrium first). */
export function cataloguePaths(): string[] {
    const paths = ["/"];
    for (const wing of CATALOGUE) {
        paths.push(`/${wing.id}`);
        for (const category of wing.categories) paths.push(`/${wing.id}/${category.id}`);
    }
    return paths;
}

function toRoom(path: string): Room {
    const r = resolveRoom(path) as CatalogueRoom;
    const meta: RoomMeta = {
        illustration: r.illustration,
        breadcrumb: r.breadcrumb,
        gameQuery: r.gameQuery,
        pageTitle: r.pageTitle,
    };
    return {
        id: path,
        name: r.title,
        desc: r.narrative,
        meta: meta as unknown as Record<string, unknown>,
        // Room id doubles as the URL path, so exits map label → target path.
        exits: r.exits.map((e) => ({dir: e.label, id: e.path})),
    };
}

/** Keyword the player types to select a librarian topic (last word of the topic id). */
function topicKeyword(id: string): string {
    const words = id.split(/\s+/);
    return words[words.length - 1];
}

function topicOption(id: string): string {
    return id.charAt(0).toUpperCase() + id.slice(1);
}

const pocketJunk = [
    {
        name: ["fluff", "lint"],
        desc: "Some fluff — Origin unknown. Possibly sentient. Has been accumulating since at least last Tuesday.",
    },
    {
        name: "button",
        desc: 'A button — Brass, slightly tarnished. You don\'t remember which coat it came from, but you\'ve been carrying it for years "just in case."',
    },
    {
        name: ["sweet", "candy"],
        desc: "An old sticky sweet — The wrapper has fused permanently to the candy. Any attempt at separation would be futile and probably dangerous.",
    },
];

/**
 * The Talebrary catalogue as a text-engine disk: the Atrium and its wings/aisles
 * as rooms, the librarian as a character you can talk to about the collection,
 * and your pocket junk as inventory. Rooms carry {@link RoomMeta} for rendering.
 */
export function athenaeumDisk(): Disk {
    const rooms = cataloguePaths().map(toRoom);

    const topics: Topic[] = librarianTopics.map((t) => ({
        keyword: topicKeyword(t.id),
        option: topicOption(t.id),
        line: t.response,
    }));

    return {
        roomId: "/",
        rooms,
        inventory: pocketJunk.map((i) => ({...i})),
        characters: [
            {
                name: ["librarian", "keeper"],
                roomId: "/",
                desc: "The librarian regards you over his spectacles, ready to help you find whatever tale you require.",
                topics,
            },
        ],
    };
}
