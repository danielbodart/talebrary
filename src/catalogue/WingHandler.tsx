import {html5} from "../templates/LinkedomHelpers.ts";
import {findWing, type Wing} from "./CatalogueConfig.ts";
import {Uri} from "../http/Uri.ts";

export class WingHandler {
    async handle(request: Request): Promise<Response> {
        const {path} = new Uri(request.url);
        const [, , wingId] = path.split('/');

        const wing = findWing(wingId);
        if (!wing) return new Response('Not Found', {status: 404});

        return new Response(render(wing), {status: 200, headers: {'Content-Type': 'text/html'}});
    }
}

function render(wing: Wing): string {
    const illustrationUrl = `/cards/art?prompt=${encodeURIComponent(JSON.stringify({
        story: {title: 'The Talebrary Athenaeum', description: 'A vast library of interactive fiction games'},
        scene: wing.illustration,
    }))}`;

    return html5(jsx =>
        <html lang="en">
        <head>
            <title>{wing.title} - Talebrary</title>
            <meta name="template" content="card"/>
            <link rel="stylesheet" href="/catalogue.css"/>
            <script src="/catalogue/main.js" type="module"></script>
        </head>
        <body>
        <main class="story catalogue">
            <div class="window buffer">
                <div class="card">
                    <img class="image" src={illustrationUrl} loading="eager" alt="" aria-hidden="true"></img>
                    <div class="title">{wing.title}</div>
                </div>
                <div class="card">
                    <div class="header">{wing.title}</div>
                    <div class="normal">{wing.narrative}</div>
                    <div class="suggestions nav">
                        <x-instruction>search...</x-instruction>
                        <a href="/catalogue">go back</a>
                        {wing.categories.map(cat =>
                            <a href={`/catalogue/${wing.id}/${cat.id}`}>go {cat.id}</a>
                        )}
                    </div>
                </div>
                <div class="card input-control">
                    <form class="input" action="/content">
                        <input type="text" maxlength={256} name="search"/>
                    </form>
                </div>
            </div>
        </main>
        </body>
        </html>);
}
