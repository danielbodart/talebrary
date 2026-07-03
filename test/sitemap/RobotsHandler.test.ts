import {describe, expect, test} from "bun:test";
import {RobotsHandler} from "../../src/sitemap/RobotsHandler.ts";

describe("RobotsHandler", () => {
    test("serves text/plain", async () => {
        const response = await new RobotsHandler().handle(new Request("https://talebrary.test/robots.txt"));
        expect(response.headers.get('content-type')).toBe('text/plain');
    });

    test("points to the sitemap using the request origin", async () => {
        const body = await (await new RobotsHandler().handle(
            new Request("https://talebrary.test/robots.txt"))).text();
        expect(body).toContain('User-agent: *');
        expect(body).toContain('Allow: /');
        expect(body).toContain('Sitemap: https://talebrary.test/sitemap.xml');
    });
});
