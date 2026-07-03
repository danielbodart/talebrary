import type {Http} from "../http/mod.ts";

export class CloudflareRestAi {
    private readonly baseUrl: string;

    // gateway: AI Gateway id to route requests through for logging/caching/limits.
    // Pass "default" to use (and auto-create) the account default gateway.
    constructor(accountId: string, private apiToken: string, private http: Http, private gateway?: string) {
        this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run`;
    }

    async run(model: string, input: any): Promise<any> {
        const {body, contentType} = await this.buildBody(input);
        const headers: Record<string, string> = {
            'Authorization': `Bearer ${this.apiToken}`,
        };
        if (contentType) headers['Content-Type'] = contentType;
        if (this.gateway) headers['cf-aig-gateway-id'] = this.gateway;

        const request = new Request(`${this.baseUrl}/${model}`, {
            method: 'POST',
            headers,
            body,
        });

        const response = await this.http(request);

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Cloudflare AI API error ${response.status} for ${model}: ${text}`);
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

    private async buildBody(input: any): Promise<{body: BodyInit; contentType: string | null}> {
        if (input.multipart) {
            // flux-2-klein: adapter serializes FormData via Response, giving us a ReadableStream
            // body and a content-type with boundary. Consume the stream to bytes so the Request
            // constructor doesn't interfere with the Content-Type header.
            const bytes = new Uint8Array(await new Response(input.multipart.body).arrayBuffer());
            return {body: bytes, contentType: input.multipart.contentType};
        }
        // Non-flux img2img: REST API expects JSON with image_b64 (not sourceImage)
        const jsonInput = {...input};
        if (jsonInput.sourceImage) {
            jsonInput.image_b64 = jsonInput.sourceImage;
            delete jsonInput.sourceImage;
        }
        return {body: JSON.stringify(jsonInput), contentType: 'application/json'};
    }
}
