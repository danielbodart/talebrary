import {html5} from "../templates/LinkedomHelpers.ts";
import {CATALOGUE} from "./CatalogueConfig.ts";

const atriumIllustration = {
    title: 'The Atrium',
    description: 'A vast library atrium with a librarian at a desk, towering bookshelves, grand archways leading to different wings of the collection.',
};

export class AtriumHandler {
    async handle(_request: Request): Promise<Response> {
        return new Response(render(), {status: 200, headers: {'Content-Type': 'text/html'}});
    }
}

function render(): string {
    const illustrationUrl = `/cards/art?prompt=${encodeURIComponent(JSON.stringify({
        story: {title: 'The Talebrary Athenaeum', description: 'A vast library of interactive fiction games'},
        scene: atriumIllustration,
    }))}`;

    return html5(jsx =>
        <html lang="en">
        <head>
            <title>The Talebrary Athenaeum</title>
            <meta name="template" content="card"/>
            <link rel="stylesheet" href="/catalogue.css"/>
            <script src="/catalogue/main.js" type="module"></script>
        </head>
        <body>
        <main class="story catalogue">
            <div class="window grid">
                <div class="card">
                    <script type="application/ld+json" class="breadcrumb">{JSON.stringify({
                        '@type': 'BreadcrumbList',
                        itemListElement: [
                            {'@type': 'ListItem', position: 1, name: 'Atrium'}
                        ]
                    })}</script>
                </div>
            </div>
            <div class="card scene-card">
                <img is="x-image" reloadable class="image" src={illustrationUrl} loading="eager" alt="" aria-hidden="true"></img>
                <div class="title">The Atrium</div>
                <div class="normal">You find yourself standing in the atrium of a vast library. Before you
                    stands the librarian, ready to help you find whatever adventure you require. To either side,
                    grand archways lead to different wings of the collection. A brass plaque on the wall reads:
                    {' '}<em>"Over 3,000 playable adventures await within."</em>
                </div>
                <div class="suggestions nav">
                    <x-instruction>search...</x-instruction>
                    {CATALOGUE.map(wing =>
                        <a href={`/catalogue/${wing.id}`}>go {wing.id}</a>
                    )}
                </div>
            </div>
            <div class="card input-control">
                <form class="input" action="/content/">
                    <input type="text" maxlength={256} name="search"/>
                </form>
            </div>
        </main>
        </body>
        </html>);
}
