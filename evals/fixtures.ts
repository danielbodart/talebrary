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

export const suggestionTreeCases: EvalCase<Describable>[] = [
    {name: "adventure-end-of-road", input: adventureEndOfRoad.scene},
    {name: "adventure-inside-building", input: adventureInsideBuilding.scene},
    {name: "adventure-below-grate", input: adventureBelowGrate.scene},
    {name: "svt-orbiting-boony", input: svtOrbitingBoony.scene},
    {name: "tobys-nose-drawing-room", input: tobysNoseDrawingRoom.scene},
];

export const illustrationCases: EvalCase<SceneContext>[] = [
    {name: "adventure-end-of-road", input: adventureEndOfRoad},
    {name: "adventure-inside-building", input: adventureInsideBuilding},
    {name: "adventure-below-grate", input: adventureBelowGrate},
    {name: "svt-orbiting-boony", input: svtOrbitingBoony},
    {name: "tobys-nose-drawing-room", input: tobysNoseDrawingRoom},
];

export interface CoverArtSceneCase {
    story: Describable;
    expectScene: boolean;
}

export const coverArtSceneCases: EvalCase<CoverArtSceneCase>[] = [
    {name: "zork1", input: {story: zork1Story, expectScene: true}},
    {name: "zork2", input: {story: zork2Story, expectScene: true}},
    {name: "zork3", input: {story: zork3Story, expectScene: true}},
    {name: "pirate-adventure", input: {story: pirateAdventureStory, expectScene: true}},
    {name: "tobys-nose", input: {story: tobysNoseStory, expectScene: true}},
    {name: "adventure", input: {story: adventureStory, expectScene: false}},  // no description
    {name: "svt", input: {story: svtStory, expectScene: false}},  // purely abstract
];

// Scene detection cases — mix of real scenes (should produce prompts)
// and story descriptions used as scenes (borderline — some are visual enough)
export interface SceneDetectionCase {
    input: SceneContext;
    expectScene: boolean; // should the LLM generate a prompt (true) or 404 (false)?
}

export const sceneDetectionCases: EvalCase<SceneDetectionCase>[] = [
    // Real scenes — should always produce a prompt
    {name: "adventure-end-of-road", input: {input: adventureEndOfRoad, expectScene: true}},
    {name: "adventure-inside-building", input: {input: adventureInsideBuilding, expectScene: true}},
    {name: "adventure-below-grate", input: {input: adventureBelowGrate, expectScene: true}},
    {name: "svt-orbiting-boony", input: {input: svtOrbitingBoony, expectScene: true}},
    {name: "tobys-nose-drawing-room", input: {input: tobysNoseDrawingRoom, expectScene: true}},
    // Story descriptions as scenes — visually descriptive ones should still produce a prompt
    {name: "zork1-as-scene", input: {input: {story: zork1Story, scene: {title: "Cover Art", description: zork1Story.description}}, expectScene: true}},
    {name: "zork2-as-scene", input: {input: {story: zork2Story, scene: {title: "Cover Art", description: zork2Story.description}}, expectScene: true}},
    {name: "zork3-as-scene", input: {input: {story: zork3Story, scene: {title: "Cover Art", description: zork3Story.description}}, expectScene: true}},
    {name: "pirate-adventure-as-scene", input: {input: {story: pirateAdventureStory, scene: {title: "Cover Art", description: pirateAdventureStory.description}}, expectScene: true}},
    {name: "svt-as-scene", input: {input: {story: svtStory, scene: {title: "Cover Art", description: svtStory.description}}, expectScene: false}},
];
