import Libhoney from "libhoney";
import type {DependsOn} from "../ApplicationScope.ts";

export class HoneycombSender {
    private libhoney: Libhoney;

    constructor(deps: DependsOn<'HONEYCOMB_API_KEY', string>) {
        this.libhoney = new Libhoney({
            writeKey: deps.HONEYCOMB_API_KEY,
            dataset: "talebrary"
        });
    }

    public async handle(request: Request): Promise<Response> {
        if (request.method !== 'POST') {
            return new Response('Method Not Allowed', {status: 405});
        }

        await this.send(await request.json());
        return new Response('Accepted', {status: 202});
    }

    public async send(data: object) {
        const event = this.libhoney.newEvent();
        event.add(data as any)
        event.send();
    }
}