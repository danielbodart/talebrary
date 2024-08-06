import {JSX2DOM} from "../jsx2dom/JSX2DOM.ts";
import {parseHTML} from "linkedom";

export function html5(fun: (jsx: JSX2DOM) => HTMLElement): string {
    const html = parseHTML('<!DOCTYPE html>');
    const elements = new JSX2DOM(html);
    html.document.append(fun(elements));
    return html.document.toString();
}
