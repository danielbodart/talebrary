import type {Auth, Session} from "./Auth.ts";
import {html5} from "../templates/LinkedomHelpers.ts";
import {Uri} from "../http/Uri.ts";
import type {Dependency} from "@bodar/yadic/types.ts";

/** Providers configured in BetterAuthAdapter — keep in sync. */
const PROVIDERS = new Set(['google']);

/**
 * Renders the auth pages and drives the no-JS social flow:
 * - `/account`         session? account view : sign-in view (Cache-Control: private)
 * - `/login`           → redirect to /account
 * - `/login/:provider` → 302 to the provider (via {@link Auth.socialSignIn})
 * - `/logout`          → sign out, 302 to /
 *
 * `/api/auth/*` is handled directly by {@link Auth.handle} in Routing, not here.
 */
export class AuthHandler {
    constructor(deps: Dependency<'auth', Auth>, private auth = deps.auth) {
    }

    async handle(request: Request): Promise<Response> {
        const [, section, id] = new Uri(request.url).path.split('/');

        if (section === 'login') {
            if (id) {
                if (!PROVIDERS.has(id)) return new Response('Not Found', {status: 404});
                // Sign-in and sign-out both return to the Atrium (browsing is the point;
                // the banner icon confirms signed-in state).
                return this.auth.socialSignIn(id, '/', request);
            }
            return redirect('/account');
        }
        if (section === 'logout') return this.auth.signOut(request);

        const session = await this.auth.getSession(request);
        return privateHtml(session ? accountPage(session) : signInPage());
    }
}

function redirect(location: string): Response {
    return new Response(null, {status: 302, headers: {Location: location}});
}

function privateHtml(body: string): Response {
    return new Response(body, {
        status: 200,
        headers: {'Content-Type': 'text/html', 'Cache-Control': 'private'},
    });
}

function breadcrumb(current: string) {
    return JSON.stringify({
        '@type': 'BreadcrumbList',
        itemListElement: [
            {'@type': 'ListItem', position: 1, name: 'Atrium', item: '/'},
            {'@type': 'ListItem', position: 2, name: current},
        ],
    });
}

function signInPage(): string {
    return html5(jsx =>
        <html lang="en">
        <head>
            <title>Sign in — Talebrary</title>
            <meta name="template" content="card"/>
        </head>
        <body class="account-page">
        <main class="story">
            <div class="window grid">
                <div class="card">
                    <script type="application/ld+json" class="breadcrumb">{breadcrumb('Account')}</script>
                </div>
            </div>
            <div class="card">
                <div class="title">Sign in</div>
                <div class="normal auth-copy">Sign in to save your progress and pick up your tales on any device.</div>
                <div class="auth-actions">
                    <a href="/login/google">Google</a>
                </div>
            </div>
        </main>
        </body>
        </html>);
}

function accountPage(session: Session): string {
    return html5(jsx =>
        <html lang="en">
        <head>
            <title>Account — Talebrary</title>
            <meta name="template" content="card"/>
        </head>
        <body class="account-page">
        <main class="story">
            <div class="window grid">
                <div class="card">
                    <script type="application/ld+json" class="breadcrumb">{breadcrumb('Account')}</script>
                </div>
            </div>
            <div class="card">
                <div class="title">Account</div>
                <div class="normal auth-copy">Signed in as {session.name ?? session.email}.</div>
                <div class="auth-actions">
                    <a href="/logout">Sign out</a>
                </div>
            </div>
        </main>
        </body>
        </html>);
}
