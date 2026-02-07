import {describe, expect, test} from "bun:test";
import {proxyHandler} from "../../src/cloudflare/proxyHandler.ts";
import type {Http} from "../../src/http/mod.ts";

describe("proxyHandler", () => {
    const token = "test-secret";
    const ok: Http = async (req) => new Response(`proxied ${req.url}`, {status: 200});

    function request(url: string, authHeader?: string): Request {
        const headers: Record<string, string> = {};
        if (authHeader) headers['Authorization'] = authHeader;
        return new Request(url, {headers});
    }

    test("rejects missing auth", async () => {
        const res = await proxyHandler(
            request("https://worker.dev/proxy?url=https://ifarchive.org/file.z5"),
            token, ok
        );
        expect(res.status).toBe(401);
    });

    test("rejects wrong token", async () => {
        const res = await proxyHandler(
            request("https://worker.dev/proxy?url=https://ifarchive.org/file.z5", "Bearer wrong"),
            token, ok
        );
        expect(res.status).toBe(401);
    });

    test("rejects missing url param", async () => {
        const res = await proxyHandler(
            request("https://worker.dev/proxy", `Bearer ${token}`),
            token, ok
        );
        expect(res.status).toBe(400);
        expect(await res.text()).toBe("Missing url param");
    });

    test("rejects invalid url param", async () => {
        const res = await proxyHandler(
            request("https://worker.dev/proxy?url=not-a-url", `Bearer ${token}`),
            token, ok
        );
        expect(res.status).toBe(400);
        expect(await res.text()).toBe("Invalid url param");
    });

    test("rejects non-ifarchive.org url", async () => {
        const res = await proxyHandler(
            request("https://worker.dev/proxy?url=https://evil.com/file", `Bearer ${token}`),
            token, ok
        );
        expect(res.status).toBe(403);
    });

    test("proxies valid ifarchive.org request", async () => {
        const target = "https://ifarchive.org/if-archive/games/zcode/advent.z5";
        const res = await proxyHandler(
            request(`https://worker.dev/proxy?url=${encodeURIComponent(target)}`, `Bearer ${token}`),
            token, ok
        );
        expect(res.status).toBe(200);
        expect(await res.text()).toBe(`proxied ${target}`);
    });

    test("proxies subdomain of ifarchive.org", async () => {
        const target = "https://www.ifarchive.org/if-archive/games/zcode/advent.z5";
        const res = await proxyHandler(
            request(`https://worker.dev/proxy?url=${encodeURIComponent(target)}`, `Bearer ${token}`),
            token, ok
        );
        expect(res.status).toBe(200);
        expect(await res.text()).toBe(`proxied ${target}`);
    });
});
