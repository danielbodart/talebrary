import type {SupportedGameType} from "../types.ts";

export interface GameBase {
    id: string;
    title: string;
    author: string;
    description?: string;
}

export interface GameInfo extends GameBase {
    rating: number;
    rank: number;
    boost: number;
    score: number;
    playable: 1 | 0;
}

export interface GameStory extends GameBase {
    url: string;
    coverart: string;
    type: SupportedGameType;
}

export interface GameFinder {
    find(search: string, languages?: string[]): Promise<GameInfo[]>;
    findByGenre(genre: string, languages?: string[]): Promise<GameInfo[]>;
    findTopRated(languages?: string[]): Promise<GameInfo[]>;
    findRecent(languages?: string[]): Promise<GameInfo[]>;
    findByIds(ids: string[], languages?: string[]): Promise<GameInfo[]>;
    get(id: string): Promise<GameStory | null>;
}
