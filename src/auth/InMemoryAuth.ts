import {type Auth, readCookie, type Session} from "./Auth.ts";

/**
 * Map-backed test/dev double for {@link Auth}. Used by the Bun composition root
 * (plain `./run start` has no D1/OAuth) and by contract/handler tests.
 *
 * `socialSignIn` fakes a successful login so the flow is exercisable without a
 * real provider round-trip.
 */
export class InMemoryAuth implements Auth {
    constructor(
        private sessions: Map<string, Session> = new Map(),
        private cookieName = 'talebrary_session',
    ) {
    }

    async handle(_request: Request): Promise<Response> {
        return new Response('Not Found', {status: 404});
    }

    async getSession(request: Request): Promise<Session | null> {
        const token = readCookie(request.headers.get('cookie'), this.cookieName);
        return (token && this.sessions.get(token)) || null;
    }

    async socialSignIn(provider: string, callbackURL: string, _request: Request): Promise<Response> {
        const token = `local-${provider}`;
        this.sessions.set(token, {userId: token, email: `${provider}@local.test`, name: `Local ${provider}`});
        const headers = new Headers({Location: callbackURL});
        headers.append('Set-Cookie', `${this.cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax`);
        return new Response(null, {status: 302, headers});
    }

    async signOut(_request: Request): Promise<Response> {
        const headers = new Headers({Location: '/'});
        headers.append('Set-Cookie', `${this.cookieName}=; Path=/; HttpOnly; Max-Age=0`);
        return new Response(null, {status: 302, headers});
    }
}
