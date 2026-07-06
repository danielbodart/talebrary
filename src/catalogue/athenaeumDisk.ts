import type {Disk, Room, SuggestionNode, Topic} from "@bodar/dullahan";
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

/** Always-available meta actions, shown beside the input (not on the scene). */
export const defaultActions: SuggestionNode[] = [
    {label: "look", command: "look", action: "submit"},
    {label: "inventory", command: "inventory", action: "submit"},
];

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
        printedName: "some fluff",
        desc: "Origin unknown. Possibly sentient. Has been accumulating since at least last Tuesday.",
        meta: {
            illustration: {
                title: "Pocket fluff",
                description: "A small ball of grey lint resting on dark polished wood, soft and fuzzy, warm candlelight, still-life close-up.",
            },
        },
    },
    {
        name: "button",
        printedName: "a button",
        desc: 'Brass, slightly tarnished. You don\'t remember which coat it came from, but you\'ve been carrying it for years "just in case."',
        meta: {
            illustration: {
                title: "A brass button",
                description: "A single tarnished brass coat button on dark polished wood, warm candlelight, still-life close-up.",
            },
        },
    },
    {
        name: ["sweet", "candy"],
        printedName: "a sweet",
        desc: "The wrapper has fused permanently to the candy. Any attempt at separation would be futile and probably dangerous.",
        meta: {
            illustration: {
                title: "An old boiled sweet",
                description: "An old boiled sweet with its wrapper fused to it, on dark polished wood, warm candlelight, still-life close-up.",
            },
        },
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
        // "find" is advertised by the engine (chip + help) but executed by the
        // consumer as a catalogue search — contextual to the current aisle.
        verbs: [{verb: "find", prefill: true}],
        inventory: pocketJunk.map((i) => ({...i})),
        characters: [
            {
                name: ["librarian", "keeper"],
                roomId: "/",
                desc: "An elderly gentleman with half-moon spectacles perched on his nose and ink stains on his fingers. He regards you with the patient, knowing air of someone who has read every spine in the building — and can find any tale you could name.",
                meta: {
                    illustration: {
                        title: "The Librarian",
                        description: "An elderly librarian with half-moon spectacles and ink-stained fingers standing at a grand desk in a vast library atrium, warm candlelight, dignified portrait.",
                    },
                },
                topics,
            },
        ],
    };
}
