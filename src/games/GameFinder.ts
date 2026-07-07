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
    /** For archive URLs: the story file to extract from inside the archive. */
    primary?: string | null;
}

export interface GameFinder {
    /** Full-text search; when `genre` is given, results are scoped to that genre. */
    find(search: string, languages?: string[], genre?: string): Promise<GameInfo[]>;
    findByGenre(genre: string, languages?: string[]): Promise<GameInfo[]>;
    findTopRated(languages?: string[]): Promise<GameInfo[]>;
    findRecent(languages?: string[]): Promise<GameInfo[]>;
    findByIds(ids: string[], languages?: string[]): Promise<GameInfo[]>;
    findAllIds(): Promise<string[]>;
    get(id: string): Promise<GameStory | null>;
}
