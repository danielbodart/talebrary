import {JSX2DOM} from "@bodar/jsx2dom/JSX2DOM.ts";
import {parseHTML} from "linkedom";

export function html5(fun: (jsx: JSX2DOM) => HTMLElement | SVGElement): string {
    const html = parseHTML('<!DOCTYPE html>');
    const jsx = new JSX2DOM(html);
    html.document.append(fun(jsx));
    return html.document.toString();
}
