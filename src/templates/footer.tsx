import type {JSX2DOM} from "../jsx2dom/JSX2DOM.ts";

export const footer = (jsx: JSX2DOM) =>
    <script defer="defer"
            src='https://static.cloudflareinsights.com/beacon.min.js'
            data-cf-beacon='{"token": "0318e83ff0164f35bdddaae3db8ec304"}'></script>;
