import type {Describable, SceneContext} from "../src/types.ts";
import type {EvalCase} from "./types.ts";

export interface CoverArtInput {
    story: Describable;
    imagePath: string;
}

const adventureStory: Describable = {
    title: "Adventure",
    description: "",
};

const adventureEndOfRoad: SceneContext = {
    story: adventureStory,
    scene: {
        title: "At End Of Road",
        description: "You are standing at the end of a road before a small brick building. Around you is a forest. A small stream flows out of the building and down a gully.",
    },
};

const adventureInsideBuilding: SceneContext = {
    story: adventureStory,
    scene: {
        title: "Inside Building",
        description: "You are inside a building, a well house for a large spring. There are some keys on the ground here. There is tasty food here. There is a shiny brass lamp nearby. There is an empty bottle here.",
    },
};

const adventureBelowGrate: SceneContext = {
    story: adventureStory,
    scene: {
        title: "Below the Grate",
        description: "You are in a small chamber beneath a 3x3 steel grate to the surface. A low crawl over cobbles leads inward to the west. The grate stands open.",
    },
};

const svtStory: Describable = {
    title: "Superluminal Vagrant Twin",
    description: "A text-only space sim. Ply the spaceways. Make five million credits. Buy back your twin. ( Superluminal Vagrant Twin is a shallow but broad exploration game.)",
};

const svtOrbitingBoony: SceneContext = {
    story: svtStory,
    scene: {
        title: "Orbiting Boony",
        description: "A grey, airless world, left lopsided by some ancient cataclysm. Aurea rests her space boots on the dashboard. \"You want to learn more about Hardshell, you should jump to Lonely Rock, talk to Cifez. But you're the captain, of course.\"",
    },
};

const tobysNoseStory: Describable = {
    title: "Toby's Nose",
    description: "A murder most foul has been committed and Sherlock Holmes is on the case. You are his dog.",
};

const tobysNoseDrawingRoom: SceneContext = {
    story: tobysNoseStory,
    scene: {
        title: "Drawing-Room",
        description: "The suspects have gathered and are disposed about the room in various attitudes. Captain Argente is leaning with one elbow propped against the fireplace mantel. Lady Argente is sitting beside the bay window, crocheting despite the occasion. Lily Argente and Vivienne Lavoux have occupied the sofa, and Jerald Argente is standing with his arms crossed. The butler has stationed himself next to the curiosity cabinet. The gardener has stationed himself next to the butler. Inspector Reines is at the doorway. Watson is seated at a small round table. Holmes is in the center, as always, and you are on your leash, of course. The dead body is sprawled on the carpet.",
    },
};

const zork1Story: Describable = {
    title: "Zork I",
    description: "The Great Underground Empire. West of a white house, a small mailbox, and an adventure that descends into darkness.",
};

const zork2Story: Describable = {
    title: "Zork II",
    description: "Your greatest challenge lies ahead — and downwards. An underground empire awaits beneath the white house.",
};

const zork3Story: Describable = {
    title: "Zork III",
    description: "The Dungeon Master awaits. The final chapter of the Zork trilogy takes you deeper into the Great Underground Empire.",
};

const pirateAdventureStory: Describable = {
    title: "Pirate Adventure",
    description: "Only by exploring this strange island will you be able to uncover the clues necessary to lead you to your elusive goal — recovering the lost treasures of Long John Silver.",
};

export const coverArtCases: EvalCase<CoverArtInput>[] = [
    {name: "adventure-cover", input: {story: adventureStory, imagePath: "evals/covers/adventure.png"}},
    {name: "zork1-cover", input: {story: zork1Story, imagePath: "evals/covers/zork1.jpg"}},
    {name: "zork2-cover", input: {story: zork2Story, imagePath: "evals/covers/zork.jpg"}},
    {name: "zork3-cover", input: {story: zork3Story, imagePath: "evals/covers/zork3.jpg"}},
    {name: "pirate-adventure-cover", input: {story: pirateAdventureStory, imagePath: "evals/covers/pirate-adventure.jpg"}},
    {name: "svt-cover", input: {story: svtStory, imagePath: "evals/covers/svt.jpg"}},
];

export const suggestionCases: EvalCase<Describable>[] = [
    {name: "adventure-end-of-road", input: adventureEndOfRoad.scene},
    {name: "adventure-inside-building", input: adventureInsideBuilding.scene},
];

export const illustrationCases: EvalCase<SceneContext>[] = [
    {name: "adventure-end-of-road", input: adventureEndOfRoad},
    {name: "adventure-inside-building", input: adventureInsideBuilding},
    {name: "adventure-below-grate", input: adventureBelowGrate},
    {name: "svt-orbiting-boony", input: svtOrbitingBoony},
    {name: "tobys-nose-drawing-room", input: tobysNoseDrawingRoom},
];
