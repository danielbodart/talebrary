import {describe, expect, test} from "bun:test";
import {InMemoryAuth} from "../../src/auth/InMemoryAuth.ts";
import type {Auth} from "../../src/auth/Auth.ts";

/**
 * Contract tests for Auth implementations. Behaviours that hold for any impl
 * regardless of the underlying engine.
 *
 * The real BetterAuthAdapter is a trusted library boundary (needs D1 + a live
 * OAuth round-trip) and is verified via Playwright under `./run startw`, not here.
 */
function authContractTests(name: string, setup: () => Auth) {
    describe(`${name} - Auth contract`, () => {
        test("getSession returns null when no cookie is present", async () => {
            const auth = setup();
            expect(await auth.getSession(new Request("http://test/account"))).toBeNull();
        });

        test("socialSignIn returns a 302 redirect with a Location", async () => {
            const auth = setup();
            const response = await auth.socialSignIn("google", "/account", new Request("http://test/login/google"));
            expect(response.status).toBe(302);
            expect(response.headers.get("location")).toBeTruthy();
        });

        test("signOut returns a 302 to / that clears the session cookie", async () => {
            const auth = setup();
            const response = await auth.signOut(new Request("http://test/logout"));
            expect(response.status).toBe(302);
            expect(response.headers.get("location")).toBe("/");
            expect(response.headers.get("set-cookie") ?? "").toContain("Max-Age=0");
        });
    });
}

authContractTests("InMemoryAuth", () => new InMemoryAuth());

describe("InMemoryAuth - fake login round-trip", () => {
    function cookieFrom(response: Response): string {
        return (response.headers.get("set-cookie") ?? "").split(";")[0];
    }

    test("socialSignIn issues a cookie that getSession then resolves to a session", async () => {
        const auth = new InMemoryAuth();
        const signIn = await auth.socialSignIn("google", "/account", new Request("http://test/login/google"));
        expect(signIn.headers.get("location")).toBe("/account");

        const session = await auth.getSession(new Request("http://test/account", {
            headers: {cookie: cookieFrom(signIn)},
        }));
        expect(session).not.toBeNull();
        expect(session!.email).toBe("google@local.test");
    });

    test("getSession reads a pre-seeded session by cookie token", async () => {
        const auth = new InMemoryAuth(new Map([["tok", {userId: "u1", email: "a@b.com", name: "Ann"}]]));
        const session = await auth.getSession(new Request("http://test/account", {
            headers: {cookie: "talebrary_session=tok"},
        }));
        expect(session).toEqual({userId: "u1", email: "a@b.com", name: "Ann"});
    });
});
