import {betterAuth} from "better-auth";
import {dash} from "@better-auth/infra";
import type {D1Database} from "@cloudflare/workers-types";
import type {Auth, Session} from "./Auth.ts";

export interface BetterAuthConfig {
    secret: string;
    baseURL: string;
    googleClientId: string;
    googleClientSecret: string;
    /** dash.better-auth.com key; omit to disable the hosted dashboard plugin. */
    dashApiKey?: string;
}

/**
 * Production {@link Auth} backed by Better Auth on Cloudflare D1.
 *
 * D1 is passed directly — Better Auth 1.5+ has a native D1 adapter that uses
 * `batch()` for atomicity (D1 has no interactive transactions), so no Kysely
 * dialect is needed. Constructed per-request in the Cloudflare root because the
 * D1 binding only exists inside the request context.
 */
export class BetterAuthAdapter implements Auth {
    private readonly auth;

    constructor(db: D1Database, config: BetterAuthConfig) {
        this.auth = betterAuth({
            database: db as any,
            secret: config.secret,
            baseURL: config.baseURL,
            // Behind Cloudflare: cf-connecting-ip is the true client IP (x-forwarded-for as fallback).
            // Needed for correct rate-limiting and dashboard activity/geo.
            advanced: {
                ipAddress: {ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"]},
            },
            socialProviders: {
                google: {clientId: config.googleClientId, clientSecret: config.googleClientSecret},
            },
            plugins: config.dashApiKey ? [dash({apiKey: config.dashApiKey})] : [],
        });
    }

    async handle(request: Request): Promise<Response> {
        const response = await this.auth.handler(request);
        // Every /api/auth/* response is personalized. Better Auth sets no
        // Cache-Control, so mark private before cacheControlHandler force-sets
        // `public` on 200 GETs (which would leak a session to shared caches).
        if (!response.headers.has('cache-control')) {
            const headers = new Headers(response.headers);
            headers.set('Cache-Control', 'private, no-store');
            return new Response(response.body, {status: response.status, statusText: response.statusText, headers});
        }
        return response;
    }

    async getSession(request: Request): Promise<Session | null> {
        const result = await this.auth.api.getSession({headers: request.headers});
        if (!result) return null;
        const {user} = result;
        return {userId: user.id, email: user.email, name: user.name ?? undefined, image: user.image ?? undefined};
    }

    async socialSignIn(provider: string, callbackURL: string, request: Request): Promise<Response> {
        const {headers, response} = await this.auth.api.signInSocial({
            body: {provider: provider as "google", callbackURL},
            headers: request.headers,
            returnHeaders: true,
        });
        const out = new Headers(headers);
        if (response?.url) out.set('Location', response.url);
        return new Response(null, {status: 302, headers: out});
    }

    async signOut(request: Request): Promise<Response> {
        const {headers} = await this.auth.api.signOut({headers: request.headers, returnHeaders: true});
        const out = new Headers(headers);
        out.set('Location', '/');
        return new Response(null, {status: 302, headers: out});
    }
}
