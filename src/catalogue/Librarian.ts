import type {GameInfo} from "../games/GameFinder.ts";

export interface LibrarianTopic {
    id: string;
    response: string;
}

export const librarianTopics: LibrarianTopic[] = [
    {
        id: 'about the athenaeum',
        response: 'The librarian settles into his chair. "The Athenaeum is no ordinary library. These shelves hold thousands of interactive tales \u2014 stories that respond to your words and let you shape the narrative. Many were written decades ago, their worlds described only in text. But this place has a way of bringing them to life." He gestures at the walls around you. "Ancient enchantments woven into the very stones conjure illustrations from the stories\u2019 own words, illuminate paths through their worlds, and make even the oldest tales accessible to new readers. Step into any aisle, choose a volume, and the story becomes yours to live."',
    },
    {
        id: 'about the illustrations',
        response: 'The librarian gestures at the images adorning the walls. "An enchantment older than any of us. As each story describes its world \u2014 a dimly lit cave, a bustling marketplace, a ship on stormy seas \u2014 the magic reads those words and conjures an image to match. Every illustration you see was born from the tale\u2019s own descriptions." He smiles. "No two readings are quite alike, for the enchantment interprets the words anew each time."',
    },
    {
        id: 'about the collection',
        response: 'The librarian\u2019s voice takes on a reverent tone. "Over three thousand interactive tales rest on these shelves, spanning half a century of storytelling. The earliest date from the 1970s \u2014 a time when pioneers first discovered that stories could be more than words on a page. They could be conversations. Adventures you step into rather than merely read." He pauses. "The collection spans every genre you can imagine \u2014 fantasy, mystery, horror, science fiction, and many more. Browse the wings, or simply tell me what you seek."',
    },
];

export function librarianResponse(search: string, games: GameInfo[]): string {
    if (games.length === 0) {
        return `The librarian adjusts his spectacles and shakes his head slowly. "I'm afraid I can't find anything matching '${search}' in our collection. Perhaps try a different search?"`;
    }
    if (games.length === 1) {
        return `The librarian nods knowingly. "Ah yes, I believe this is what you're looking for." He produces a single volume from beneath the desk.`;
    }
    return `The librarian nods and disappears into the stacks. After a moment he returns with ${games.length} titles. "These should match what you're looking for."`;
}
