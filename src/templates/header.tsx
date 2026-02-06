import {fonts} from "./fonts.tsx";
import type {JSX2DOM} from "@bodar/jsx2dom/JSX2DOM.ts";

export const header = (jsx: JSX2DOM) => <>
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    {fonts(jsx)}
</>;
