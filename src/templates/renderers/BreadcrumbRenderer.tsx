import {JSX2DOM} from "@bodar/jsx2dom/JSX2DOM.ts";

interface ListItem {
    '@type': 'ListItem';
    position: number;
    name: string;
    item?: string;
}

interface BreadcrumbList {
    '@type': 'BreadcrumbList';
    itemListElement: ListItem[];
}

export function breadcrumbRenderer(element: Element): ChildNode {
    const document = element.ownerDocument;
    const breadcrumb = JSON.parse(element.textContent ?? '{}') as BreadcrumbList;
    const items = breadcrumb.itemListElement.toSorted((a, b) => a.position - b.position);
    const jsx = new JSX2DOM(document.defaultView!);

    return <div class="breadcrumb">
        {items.flatMap((item, i) => {
            const isLast = i === items.length - 1;
            const elements: (HTMLElement | SVGElement | string)[] = [];
            if (i > 0) elements.push(<span class="sep">{'\u203A'}</span>);
            if (isLast || !item.item) {
                elements.push(<span class="current">{item.name}</span>);
            } else {
                elements.push(<a href={item.item}>{item.name}</a>);
            }
            return elements;
        })}
    </div>;
}
