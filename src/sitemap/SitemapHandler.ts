import type {Dependency} from "@bodar/yadic/types.ts";
import type {GameFinder} from "../games/GameFinder.ts";
import {CATALOGUE} from "../catalogue/CatalogueConfig.ts";

function escapeXml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/** Static, in-code browse pages: the atrium and its categories (wings 301 to the atrium). */
export function browsePaths(): string[] {
    return [
        '/',
        ...CATALOGUE.flatMap(wing =>
            wing.categories.map(category => `/${wing.id}/${category.id}`)),
    ];
}

export class SitemapHandler {
    constructor(deps: Dependency<'finder', GameFinder>, private finder: GameFinder = deps.finder) {
    }

    async handle(request: Request): Promise<Response> {
        const {origin} = new URL(request.url);
        const ids = await this.finder.findAllIds();

        const paths = [
            ...browsePaths(),
            ...ids.map(id => `/content/${id}`),
        ];

        const urls = paths
            .map(path => `  <url><loc>${escapeXml(origin + path)}</loc></url>`)
            .join('\n');

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

        return new Response(xml, {
            headers: {'content-type': 'application/xml'},
        });
    }
}
