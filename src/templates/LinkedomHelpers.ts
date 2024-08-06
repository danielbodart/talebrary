import {Elements} from "./elements.ts";
import {parseHTML} from "linkedom";

export function html5(fun: (elements: Elements) => HTMLElement): string {
    const html = parseHTML('<!DOCTYPE html>');
    const elements = new Elements(html);
    html.document.append(fun(elements));
    return html.document.toString();
}
