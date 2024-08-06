import type {Elements} from "./elements.ts";

export const footer = (elements: Elements) =>
    <script defer="defer"
            src='https://static.cloudflareinsights.com/beacon.min.js'
            data-cf-beacon='{"token": "0318e83ff0164f35bdddaae3db8ec304"}'></script>;
