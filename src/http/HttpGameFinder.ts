import {get, type HttpHandler} from "./mod.ts";
import {XMLParser} from "fast-xml-parser";

interface SearchResult {
    searchReply: {
        games: {
            game: GameResult[]
        }
    }
}

export interface GameResult {
    "tuid": string,
    "title": string,
    "link": string, // url
    "author": string,
    "averageRating": number,
    "numRatings": number,
    "starRating": number,
    "hasCoverArt": 'yes' | 'no',
    "devsys": string,
    "published": {
        "machine": number,
        "printable": number
    },
    "coverArtLink": string // url
}

export class HttpGameFinder {
    constructor(private http: HttpHandler, private parser = new XMLParser()) {
    }

    async find(search: string): Promise<GameResult[]> {
        const uri = `https://ifdb.org/search?xml&game&searchfor=${search}`;
        const response = await this.http(get(uri));
        if (response.status !== 200) return [];
        const text = await response.text();
        const result: SearchResult = this.parser.parse(text);
        return result.searchReply.games.game;
    }
}