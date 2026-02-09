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

    private buildBody(model: string, input: any): {body: BodyInit; contentType: string | null} {
        if (input.multipart) {
            // The adapter produces multipart.body/contentType for the native
            // Cloudflare Workers binding (ReadableStream + boundary).
            // The REST API has different requirements per model:
            // - flux-2-klein: multipart FormData with input_image_0
            // - Other img2img (e.g. sd-v1-5-img2img): JSON with image_b64
            // - Text-to-image: JSON with just prompt
            if (model.includes('flux-2-klein')) {
                return {body: this.buildFormData(input), contentType: null};
            }
            const {multipart, ...jsonFields} = input;
            if (jsonFields.sourceImage) {
                jsonFields.image_b64 = jsonFields.sourceImage;
                delete jsonFields.sourceImage;
            }
            return {body: JSON.stringify(jsonFields), contentType: 'application/json'};
        }
        return {body: JSON.stringify(input), contentType: 'application/json'};
    }

    private buildFormData(input: any): FormData {
        const form = new FormData();
        form.append('prompt', input.prompt);
        if (input.num_steps) form.append('num_steps', String(input.num_steps));
        if (input.sourceImage) {
            const bytes = Uint8Array.from(atob(input.sourceImage), c => c.charCodeAt(0));
            form.append('input_image_0', new Blob([bytes]));
        }
        return form;
    }
}
