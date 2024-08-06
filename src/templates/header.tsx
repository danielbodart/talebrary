import {fonts} from "./fonts.tsx";
import type {Elements} from "./elements.ts";

export const header = (elements: Elements) => <>
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    {fonts(elements)}
</>;
