import type {EventSender} from "./EventSender.ts";
import type {Dependency} from "@bodar/yadic/types.ts";

export class EventHandler {
    constructor(deps: Dependency<'eventSender', EventSender>, private sender = deps.eventSender) {
    }
    public async handle(request: Request): Promise<Response> {
        if (request.method !== 'POST') {
            return new Response('Method Not Allowed', {status: 405});
        }

        await this.sender.send(await request.json());
        return new Response('Accepted', {status: 202});
    }
}