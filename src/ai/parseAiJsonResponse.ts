/**
 * Parses an AI text generation response that may be either a JSON string or an already-parsed object.
 *
 * Cloudflare AI models inconsistently return `response` as either:
 * - A JSON string (needs parsing)
 * - An already-parsed object (pass through)
 *
 * This function normalises both cases.
 */
export function parseAiJsonResponse(output: { response?: string | object }): Record<string, any> {
    const response = output.response;
    if (typeof response === 'string') return JSON.parse(response);
    if (typeof response === 'object' && response !== null) return response;
    throw new Error('AI response has no response field');
}
