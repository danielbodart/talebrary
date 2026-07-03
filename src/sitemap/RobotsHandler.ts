export class RobotsHandler {
    async handle(request: Request): Promise<Response> {
        const {origin} = new URL(request.url);
        const body = `User-agent: *
Allow: /

Sitemap: ${origin}/sitemap.xml
`;
        return new Response(body, {
            headers: {'content-type': 'text/plain'},
        });
    }
}
