import type {HttpHandler} from "../http/mod.ts";
import type {Timers} from "../timers.ts";
import type {DependsOn} from "../ApplicationScope.ts";
import type {Clock} from "../clock.ts";

export interface EventBatcherConfig extends DependsOn<'http', HttpHandler>,
    DependsOn<'timers', Timers>,
    DependsOn<'clock', Clock> {
    HONEYCOMB_API_KEY: string
    HONEYCOMB_BATCH_SIZE: number
}

export class EventBatcher {
    readonly BASE_URL = `https://api.honeycomb.io/1/batch/talebrary`;
    private queued: object[] = [];

    constructor(private deps: EventBatcherConfig) {
        this.deps.timers.setInterval(async () => {
            try {
                await this.flush();
            } catch (e: unknown) {
                console.error('unexpected error:', (e && typeof e === 'object' && 'message' in e) ? e.message : e);
            }
        }, 1000);
    }

    get batchSize() {
        return this.deps.HONEYCOMB_BATCH_SIZE;
    }

    public async handle(request: Request): Promise<Response> {
        if (request.method !== 'POST') {
            return new Response('Method Not Allowed', {status: 405});
        }

        await this.send(await request.json());
        return new Response('Accepted', {status: 202});
    }

    public async send(event: object) {
        if (this.queued.length > this.batchSize) await this.flush();

        this.queued.push(event);
    }

    public async flush() {
        if (this.queued.length === 0) return;
        const batch = this.queued.splice(0, this.batchSize);
        console.log(`Flushing batch of ${batch.length}, remaining in queue ${this.queued.length}`);
        await this.sendBatch(batch);
    }

    async sendBatch(batch: object[]) {
        const response = await this.deps.http(new Request(this.BASE_URL, {
            method: 'POST',
            body: JSON.stringify(batch.map(data => ({
                time: this.deps.clock.now(),
                samplerate: 1,
                data
            }))),
            headers: {
                'Content-Type': 'application/json',
                'X-Honeycomb-Team': this.deps.HONEYCOMB_API_KEY,
            },
        }));

        if (response.ok) {
            console.log('Honeycomb accepted', batch.length);
            return true;
        } else {
            const responseBody = await response.text();
            console.error('Honeycomb rejected', response.status, responseBody, batch.length);
            return false;
        }
    }
}