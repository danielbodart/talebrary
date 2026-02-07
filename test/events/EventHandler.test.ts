import {describe, expect, test} from "bun:test";
import {EventHandler} from "../../src/events/EventHandler.ts";

describe("EventHandler", () => {
    test("accepts POST with JSON body", async () => {
        let sentEvent: any = null;
        const handler = new EventHandler({
            eventSender: {send: async (event: object) => { sentEvent = event; }}
        });

        const response = await handler.handle(new Request("http://test/events", {
            method: "POST",
            headers: {"content-type": "application/json"},
            body: JSON.stringify({type: "page_view", page: "/content/123"}),
        }));
        expect(response.status).toBe(202);
        expect(sentEvent).toEqual({type: "page_view", page: "/content/123"});
    });

    test("rejects non-POST methods", async () => {
        const handler = new EventHandler({
            eventSender: {send: async () => {}}
        });

        const response = await handler.handle(new Request("http://test/events"));
        expect(response.status).toBe(405);
    });
});
