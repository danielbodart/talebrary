import type {GameFinder, GameInfo, GameStory} from "./GameFinder.ts";

export class InMemoryGameFinder implements GameFinder {
    private games: GameInfo[];
    private stories: Map<string, GameStory>;

    constructor(games: GameInfo[] = [], stories: Map<string, GameStory> = new Map()) {
        this.games = games;
        this.stories = stories;
    }

    async find(search: string, _languages?: string[]): Promise<GameInfo[]> {
        if (!search) return this.games.slice(0, 20);
        const term = search.toLowerCase();
        return this.games
            .filter(g => g.title.toLowerCase().includes(term)
                || g.author.toLowerCase().includes(term)
                || g.description?.toLowerCase().includes(term))
            .slice(0, 20);
    }

    async findByGenre(genre: string, _languages?: string[]): Promise<GameInfo[]> {
        return this.games
            .filter(g => (g as any).genre === genre)
            .slice(0, 20);
    }

    async findTopRated(_languages?: string[]): Promise<GameInfo[]> {
        return [...this.games]
            .sort((a, b) => b.rating - a.rating)
            .slice(0, 20);
    }

    async findRecent(_languages?: string[]): Promise<GameInfo[]> {
        return [...this.games].slice(0, 20);
    }

    async findByIds(ids: string[], _languages?: string[]): Promise<GameInfo[]> {
        return this.games.filter(g => ids.includes(g.id));
    }

    async get(id: string): Promise<GameStory | null> {
        return this.stories.get(id) ?? null;
    }
}
