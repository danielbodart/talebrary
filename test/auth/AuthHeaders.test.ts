import {describe, expect, test} from "bun:test";
import {AuthHandler} from "../../src/auth/AuthHandler.tsx";
import {InMemoryAuth} from "../../src/auth/InMemoryAuth.ts";
import {templateHandler} from "../../src/templates/TemplateHandler.ts";
import {cacheControlHandler} from "../../src/http/CacheControl.ts";
import {etagHandler} from "../../src/http/EtagHandler.ts";
import {md5} from "../../src/bun/digest.ts";
import type {Http} from "../../src/http/mod.ts";

/**
 * The full response pipeline is etag(cacheControl(template(handler))). Personalized
 * auth responses must survive it: private stays private (never rewritten to public),
 * and the OAuth Set-Cookie on redirects passes through untouched.
 */
function pipeline(auth = new InMemoryAuth()): Http {
    const handler = new AuthHandler({auth});
    let http: Http = request => handler.handle(request);
    http = templateHandler(http, {});
    http = cacheControlHandler(http);
    http = etagHandler(md5, http);
    return http;
}

describe("auth response pipeline", () => {
    test("private /account is NOT rewritten to public by cacheControlHandler", async () => {
        const response = await pipeline()(new Request("http://test/account"));
        expect(response.headers.get("cache-control")).toBe("private");
        expect(response.headers.get("cache-control")).not.toContain("public");
    });

    test("the /account shell still renders through the template (account link present)", async () => {
        const response = await pipeline()(new Request("http://test/account"));
        const body = await response.text();
        expect(body).toContain("Google");
        expect(body).toContain('class="account-link"');
    });

    test("social sign-in 302 keeps its Set-Cookie and is not marked public", async () => {
        const response = await pipeline()(new Request("http://test/login/google"));
        expect(response.status).toBe(302);
        expect(response.headers.get("set-cookie")).toBeTruthy();
        expect(response.headers.get("cache-control") ?? "").not.toContain("public");
    });
});
