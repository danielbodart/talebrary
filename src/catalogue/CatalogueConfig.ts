import type {Describable} from "../types.ts";

export interface Exit {
    path: string;
    label: string;
}

export interface BreadcrumbItem {
    name: string;
    item?: string;
}

export interface GameQuery {
    type: 'genre' | 'top-rated' | 'recent' | 'hand-picked' | 'search';
    genre?: string;
    ids?: string[];
    search?: string;
}

export interface Room {
    title: string;
    pageTitle: string;
    narrative: string;
    illustration: Describable;
    exits: Exit[];
    breadcrumb: BreadcrumbItem[];
    gameQuery?: GameQuery;
}

export interface Category {
    id: string;
    title: string;
    narrative: string;
    illustration: Describable;
}

export interface GenreCategory extends Category {
    genre: string;
}

export interface CuratedCategory extends Category {
    type: 'top-rated' | 'recent';
}

export interface HandPickedCategory extends Category {
    games: string[];
}

export type AnyCategory = GenreCategory | CuratedCategory | HandPickedCategory;

export function isGenreCategory(c: AnyCategory): c is GenreCategory {
    return 'genre' in c;
}

export function isHandPickedCategory(c: AnyCategory): c is HandPickedCategory {
    return 'games' in c;
}

export interface Wing {
    id: string;
    title: string;
    narrative: string;
    illustration: Describable;
    categories: AnyCategory[];
}

export const genres: Wing = {
    id: 'genres',
    title: 'Genre Wings',
    narrative: 'You step through the eastern archway into a vast hall lined with towering shelves. Each aisle is marked with a bronze plaque denoting a different genre of interactive fiction. The air smells of old paper and possibility. Somewhere deeper in the stacks, you can hear the faint turning of pages.',
    illustration: {
        title: 'Genre Wings Hall',
        description: 'A grand library hall with multiple aisles branching off, each marked by bronze plaques. Classical architecture, warm lamplight.',
    },
    categories: [
        {
            id: 'fantasy',
            title: 'Fantasy Aisle',
            genre: 'Fantasy',
            narrative: 'Dragons, wizards, and ancient artifacts line these shelves. Stories of magic and heroic quests await those brave enough to open these covers. The spines shimmer faintly in the lamplight, each one a doorway to another world.',
            illustration: {
                title: 'Fantasy Library Aisle',
                description: 'A magical library aisle with glowing spell books, floating candles, and enchanted tomes. Warm mystical atmosphere.',
            },
        },
        {
            id: 'horror',
            title: 'Horror Aisle',
            genre: 'Horror',
            narrative: 'A chill runs down your spine as you approach these shelves. The lamplight flickers here, casting long shadows between the stacks. Dark tales and psychological terrors lurk within these pages.',
            illustration: {
                title: 'Horror Library Aisle',
                description: 'A dimly lit library aisle with cobwebs, flickering lamps, and ominous shadows. Gothic atmosphere, eerie.',
            },
        },
        {
            id: 'science-fiction',
            title: 'Science Fiction Aisle',
            genre: 'Science Fiction',
            narrative: 'The shelves here hum with an electric quality. Stories of distant stars, artificial minds, and futures both utopian and dystopian line the walls. The brass plaques give way to something more metallic.',
            illustration: {
                title: 'Science Fiction Library Aisle',
                description: 'A futuristic library aisle blending classical architecture with sci-fi elements. Holographic book spines, soft blue glow.',
            },
        },
        {
            id: 'mystery',
            title: 'Mystery Aisle',
            genre: 'Mystery',
            narrative: 'Shadows dance between the stacks here. Detective tales and unsolved puzzles beckon you to investigate. A magnifying glass rests on a reading stand, as if left by the last visitor.',
            illustration: {
                title: 'Mystery Library Aisle',
                description: 'A noir-styled library aisle with dramatic lighting, magnifying glass on a desk, detective atmosphere.',
            },
        },
        {
            id: 'humor',
            title: 'Humor Aisle',
            genre: 'Humor',
            narrative: 'You can hear muffled laughter coming from these shelves. The books here seem to lean at jaunty angles, and one appears to be telling a joke to its neighbour.',
            illustration: {
                title: 'Humor Library Aisle',
                description: 'A whimsical library aisle with books at playful angles, warm cheerful lighting, cartoon-like quality.',
            },
        },
        {
            id: 'slice-of-life',
            title: 'Slice of Life Aisle',
            genre: 'Slice of life',
            narrative: 'These shelves hold quiet stories of everyday moments made extraordinary. A comfortable reading chair sits in the alcove, inviting you to linger with tales of ordinary lives and hidden depths.',
            illustration: {
                title: 'Slice of Life Library Aisle',
                description: 'A cozy library nook with a reading chair, warm sunlight through windows, everyday domestic warmth.',
            },
        },
        {
            id: 'surreal',
            title: 'Surreal Aisle',
            genre: 'Surreal',
            narrative: 'The shelves here seem to bend in ways that defy geometry. Is that book upside down, or are you? Reality is a suggestion in this corner of the library.',
            illustration: {
                title: 'Surreal Library Aisle',
                description: 'A library aisle where shelves twist impossibly, Escher-like perspectives, dreamlike atmosphere with melting clocks.',
            },
        },
        {
            id: 'historical',
            title: 'Historical Aisle',
            genre: 'Historical',
            narrative: 'Dust motes dance in the lamplight as you enter this wing. These volumes transport you to times past, from ancient civilisations to more recent history, each one meticulously researched.',
            illustration: {
                title: 'Historical Library Aisle',
                description: 'An antiquarian library section with old maps, globes, leather-bound volumes, sepia-toned warm light.',
            },
        },
    ],
};

export const collections: Wing = {
    id: 'collections',
    title: 'Special Collections',
    narrative: 'Behind a velvet rope, curated collections of exceptional works rest on mahogany display shelves. These are the treasures of the library, gathered and arranged by the librarian himself.',
    illustration: {
        title: 'Special Collections Hall',
        description: 'An exclusive library hall with velvet ropes, mahogany display cases, brass lamps, prestigious atmosphere.',
    },
    categories: [
        {
            id: 'top-rated',
            title: 'Highest Rated',
            type: 'top-rated' as const,
            narrative: 'Gold ribbons mark these spines. Each one a recognised masterpiece, consistently earning the highest marks from players who have ventured within their pages.',
            illustration: {
                title: 'Highest Rated Collection',
                description: 'A prestigious library display of celebrated books with gold ribbons and award medallions.',
            },
        },
        {
            id: 'recent',
            title: 'Recent Arrivals',
            type: 'recent' as const,
            narrative: 'Fresh ink still drying on these pages. The newest additions to the collection, waiting to be discovered by their first readers.',
            illustration: {
                title: 'Recent Arrivals',
                description: 'A new releases shelf with modern books, fresh and contemporary, warm welcoming display.',
            },
        },
        {
            id: 'classics',
            title: 'Classics',
            games: [
                'fft6pu91j85y4acv', // Adventure (Colossal Cave)
                '0dbnusxunq7fw5ro', // Zork I
                'yzzm4puxyjakk8c4', // Zork II
                'vrsot1zgy1wfcdru', // Zork III
                'xe6kb3cuqwie2q38', // Planetfall
                'j18kjz80hxjtyayw', // Trinity
                '4h62dvooeg9ajtfa', // A Mind Forever Voyaging
                'vu4xhul3abknifcr', // Enchanter
                'z02joykzh66wfhcl', // Wishbringer
            ],
            narrative: 'These weathered volumes occupy a place of honour in the library. The earliest works of interactive fiction, they laid the foundations for everything that followed. From the depths of the Great Underground Empire to the echoing caverns of Colossal Cave, these are the stories that started it all.',
            illustration: {
                title: 'Classics Collection',
                description: 'An ancient, revered section of the library with worn leather-bound volumes on ornate wooden shelves. Brass plaques, candlelight, a sense of history and reverence.',
            },
        },
    ],
};

export const CATALOGUE: Wing[] = [genres, collections];

export function findWing(wingId: string): Wing | undefined {
    return CATALOGUE.find(w => w.id === wingId);
}

export function findCategory(wing: Wing, categoryId: string): AnyCategory | undefined {
    return wing.categories.find(c => c.id === categoryId);
}

export const atriumIllustration: Describable = {
    title: 'The Atrium',
    description: 'A vast library atrium with a librarian at a desk, towering bookshelves, grand archways leading to different wings of the collection.',
};

function categoryToQuery(category: AnyCategory): GameQuery {
    if (isGenreCategory(category)) return {type: 'genre', genre: category.genre};
    if (isHandPickedCategory(category)) return {type: 'hand-picked', ids: category.games};
    return {type: category.type};
}

export function resolveRoom(path: string, search?: string): Room | undefined {
    const segments = path.replace(/\/+$/, '').split('/').filter(Boolean);
    // Strip optional /catalogue prefix for backwards compat
    if (segments[0] === 'catalogue' || segments[0] === 'content') segments.shift();

    // / (atrium)
    if (segments.length === 0) {
        return {
            title: 'The Atrium',
            pageTitle: 'The Talebrary Athenaeum',
            narrative: 'You find yourself standing in the atrium of a vast library. Before you stands the librarian, ready to help you find whatever tale you require. To either side, grand archways lead to different wings of the collection. A brass plaque on the wall reads: "Over 2,000 interactive tales await within."',
            illustration: atriumIllustration,
            exits: CATALOGUE.map(w => ({path: `/${w.id}`, label: w.id})),
            breadcrumb: [{name: 'Atrium'}],
            gameQuery: search ? {type: 'search', search} : undefined,
        };
    }

    // /<wingId>
    if (segments.length === 1) {
        const wing = findWing(segments[0]);
        if (!wing) return undefined;
        return {
            title: wing.title,
            pageTitle: `${wing.title} - Talebrary`,
            narrative: wing.narrative,
            illustration: wing.illustration,
            exits: [
                {path: '/', label: 'back'},
                ...wing.categories.map(c => ({path: `/${wing.id}/${c.id}`, label: c.id})),
            ],
            breadcrumb: [
                {name: 'Atrium', item: '/'},
                {name: wing.title},
            ],
            gameQuery: search ? {type: 'search', search} : undefined,
        };
    }

    // /<wingId>/<categoryId>
    if (segments.length === 2) {
        const wing = findWing(segments[0]);
        if (!wing) return undefined;
        const category = findCategory(wing, segments[1]);
        if (!category) return undefined;
        const siblings = wing.categories.filter(c => c.id !== category.id).slice(0, 2);
        return {
            title: category.title,
            pageTitle: `${category.title} - ${wing.title} - Talebrary`,
            narrative: category.narrative,
            illustration: category.illustration,
            exits: [
                {path: `/${wing.id}`, label: 'back'},
                ...siblings.map(c => ({path: `/${wing.id}/${c.id}`, label: c.id})),
            ],
            breadcrumb: [
                {name: 'Atrium', item: '/'},
                {name: wing.title, item: `/${wing.id}`},
                {name: category.title},
            ],
            gameQuery: search ? {type: 'search', search} : categoryToQuery(category),
        };
    }

    return undefined;
}
