import type {HttpHandler} from "./http.ts";

export class Seconds {
    static minutes(count: number) {
        return count * 60;
    }

    static hours(count: number) {
        return count * this.minutes(60);
    }

    static days(count: number) {
        return count * this.hours(24);
    }
}

export class CacheControl {
    static Public = `public, max-age=${Seconds.minutes(1)}, stale-while-revalidate=${Seconds.minutes(10)}, stale-if-error=${Seconds.minutes(10)}`;
}

export function cacheHandler(http: HttpHandler) {
    return async (request: Request) => {
        const response = await http(request);
        const cacheControl = response.headers.get('cache-control');
        if (request.method === 'GET' && response.ok && cacheControl && cacheControl.includes('public') ) {
            response.headers.set('cache-control', CacheControl.Public);
        }
        return response;
    }
}

