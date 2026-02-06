import type {Http} from "../http/mod.ts";

export class CloudflareRestAi {
    private readonly baseUrl: string;

    constructor(accountId: string, private apiToken: string, private http: Http) {
        this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run`;
    }

    async run(model: string, input: any): Promise<any> {
        const request = new Request(`${this.baseUrl}/${model}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(input),
        });

        const response = await this.http(request);

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Cloudflare AI API error ${response.status}: ${text}`);
        }

        const contentType = response.headers.get('content-type') ?? '';
        console.log('CloudflareRestAi', model, 'content-type:', contentType, 'status:', response.status);
        if (contentType.includes('image/')) {
            return new Uint8Array(await response.arrayBuffer());
        }

        const json: any = await response.json();
        const result = json.result;
        if (result?.response && typeof result.response !== 'string') {
            result.response = JSON.stringify(result.response);
        }
        return result;
    }
}
