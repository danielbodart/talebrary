import type {Http} from "../http/mod.ts";

export class CloudflareRestAi {
    private readonly baseUrl: string;

    constructor(accountId: string, private apiToken: string, private http: Http) {
        this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run`;
    }

    async run(model: string, input: any): Promise<any> {
        const {body, contentType} = this.buildBody(model, input);
        const headers: Record<string, string> = {
            'Authorization': `Bearer ${this.apiToken}`,
        };
        if (contentType) headers['Content-Type'] = contentType;

        const request = new Request(`${this.baseUrl}/${model}`, {
            method: 'POST',
            headers,
            body,
        });

        const response = await this.http(request);

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Cloudflare AI API error ${response.status}: ${text}`);
        }

        const responseContentType = response.headers.get('content-type') ?? '';
        console.log('CloudflareRestAi', model, 'content-type:', responseContentType, 'status:', response.status);
        if (responseContentType.includes('image/')) {
            return new Uint8Array(await response.arrayBuffer());
        }

        const json: any = await response.json();
        const result = json.result;
        if (result?.image && typeof result.image === 'string') {
            return Uint8Array.from(atob(result.image), c => c.charCodeAt(0));
        }
        if (result?.response && typeof result.response !== 'string') {
            if (Array.isArray(result.response.choices)) {
                return result.response;
            }
            result.response = JSON.stringify(result.response);
        }
        return result;
    }

    private buildBody(_model: string, input: any): {body: BodyInit; contentType: string | null} {
        if (input.multipart) {
            return {body: input.multipart.body, contentType: null};
        }
        return {body: JSON.stringify(input), contentType: 'application/json'};
    }
}
