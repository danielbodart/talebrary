export interface Session {
    userId: string;
    email: string;
    name?: string;
    image?: string;
}

export interface Auth {
    /** Delegates the whole /api/auth/* subtree to the underlying auth engine. */
    handle(request: Request): Promise<Response>;
    /** Server-side session read from the request cookie. */
    getSession(request: Request): Promise<Session | null>;
    /** 302 to the provider, carrying any OAuth state cookie the engine needs at callback. */
    socialSignIn(provider: string, callbackURL: string, request: Request): Promise<Response>;
    /** 302 to `/`, clearing the session cookie. */
    signOut(request: Request): Promise<Response>;
}

export function readCookie(header: string | null, name: string): string | undefined {
    if (!header) return undefined;
    for (const part of header.split(';')) {
        const [key, ...value] = part.trim().split('=');
        if (key === name) return decodeURIComponent(value.join('='));
    }
    return undefined;
}
