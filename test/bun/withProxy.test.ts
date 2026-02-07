import {describe, expect, test} from "bun:test";
import {withProxy} from "../../src/bun/withProxy.ts";
import type {Http} from "../../src/http/mod.ts";

describe("withProxy", () => {
    const proxyUrl = "https://worker.example.dev";
    const proxyToken = "test-secret";

    const inner: Http = async (req) => new Response(`inner ${req.url}`, {status: 200});
    const proxyHttp: Http = async (req) => new Response(`proxied ${req.url}`, {status: 200});

    test("routes ifarchive.org through proxy with auth", async () => {
        const requests: Request[] = [];
        const capture: Http = async (req) => {
            requests.push(req);
            return new Response("proxied", {status: 200});
        };
        const http = withProxy(inner, proxyUrl, proxyToken, capture);
        await http(new Request("https://ifarchive.org/if-archive/games/zcode/advent.z5"));

        expect(requests).toHaveLength(1);
        expect(requests[0].url).toBe(
            `${proxyUrl}/proxy?url=${encodeURIComponent("https://ifarchive.org/if-archive/games/zcode/advent.z5")}`
        );
        expect(requests[0].headers.get('Authorization')).toBe(`Bearer ${proxyToken}`);
    });

    test("routes subdomain of ifarchive.org through proxy", async () => {
        const http = withProxy(inner, proxyUrl, proxyToken, proxyHttp);
        const res = await http(new Request("https://www.ifarchive.org/indexes/if-archive/"));
        expect(res.status).toBe(200);
        expect(await res.text()).toStartWith("proxied");
    });

    test("passes non-ifarchive requests to inner handler", async () => {
        const http = withProxy(inner, proxyUrl, proxyToken, proxyHttp);
        const res = await http(new Request("http://localhost:3000/games"));
        expect(res.status).toBe(200);
        expect(await res.text()).toBe("inner http://localhost:3000/games");
    });

    test("passes other external requests to inner handler", async () => {
        const http = withProxy(inner, proxyUrl, proxyToken, proxyHttp);
        const res = await http(new Request("https://example.com/something"));
        expect(res.status).toBe(200);
        expect(await res.text()).toBe("inner https://example.com/something");
    });
});
