import {fonts} from "./fonts.tsx";
import type {JSX2DOM} from "@bodar/jsx2dom/JSX2DOM.ts";

export const header = (jsx: JSX2DOM) => <>
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg"/>
    {fonts(jsx)}
    {/* Cloudflare Web Analytics — injected manually; auto-injection does not run on Worker responses */}
    <script defer src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon='{"token": "0318e83ff0164f35bdddaae3db8ec304"}'></script>
</>;
