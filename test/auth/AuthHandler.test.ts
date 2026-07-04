import {describe, expect, test} from "bun:test";
import {AuthHandler} from "../../src/auth/AuthHandler.tsx";
import {InMemoryAuth} from "../../src/auth/InMemoryAuth.ts";

function handler(auth = new InMemoryAuth()): AuthHandler {
    return new AuthHandler({auth});
}

describe("AuthHandler", () => {
    test("GET /account without a session renders the sign-in page, marked private", async () => {
        const response = await handler().handle(new Request("http://test/account"));
        expect(response.status).toBe(200);
        expect(response.headers.get("cache-control")).toBe("private");
        const body = await response.text();
        expect(body).toContain("Google");
        expect(body).toContain('href="/login/google"');
    });

    test("GET /account with a session renders the account page, marked private", async () => {
        const auth = new InMemoryAuth(new Map([["tok", {userId: "u1", email: "a@b.com", name: "Ann"}]]));
        const response = await handler(auth).handle(new Request("http://test/account", {
            headers: {cookie: "talebrary_session=tok"},
        }));
        expect(response.headers.get("cache-control")).toBe("private");
        const body = await response.text();
        expect(body).toContain("Ann");
        expect(body).toContain('href="/logout"');
    });

    test("GET /login redirects to /account", async () => {
        const response = await handler().handle(new Request("http://test/login"));
        expect(response.status).toBe(302);
        expect(response.headers.get("location")).toBe("/account");
    });

    test("GET /login/google initiates the social flow (302 back to the Atrium)", async () => {
        const response = await handler().handle(new Request("http://test/login/google"));
        expect(response.status).toBe(302);
        expect(response.headers.get("location")).toBe("/");
        expect(response.headers.get("set-cookie")).toBeTruthy();
    });

    test("GET /login/<unknown provider> returns 404, not a 500", async () => {
        const response = await handler().handle(new Request("http://test/login/facebook"));
        expect(response.status).toBe(404);
    });

    test("GET /logout signs out (302 to /)", async () => {
        const response = await handler().handle(new Request("http://test/logout"));
        expect(response.status).toBe(302);
        expect(response.headers.get("location")).toBe("/");
    });
});
