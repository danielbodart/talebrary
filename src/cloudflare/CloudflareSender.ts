import type {EventSender} from "../events/EventSender.ts";
import type {Queue} from "@cloudflare/workers-types";

export class CloudflareSender implements EventSender {
    constructor(private queue: Queue) {

    }

    async send(event: object): Promise<any> {
        await this.queue.send(event, {contentType: "json"})
    }

}