import type {Dependency} from "../yadic/mod.ts";

export interface Measure {
    width: number;
    height: number;
}

export function charWidthHeight(document: Document, styled: HTMLElement): Measure {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    const style = getComputedStyle(styled);

    context.font = `${style.fontStyle} ${style.fontVariant} ${style.fontWeight} ${style.lineHeight} ${style.fontFamily};`

    const size = context.measureText('M');
    const width = size.actualBoundingBoxLeft + size.actualBoundingBoxRight;
    const height = size.fontBoundingBoxAscent + size.fontBoundingBoxDescent;

    return {width, height};
}

export function calculateMaxSize({window}: Dependency<'window', Window>): Measure {
    const grid = window.document.createElement('div');
    grid.classList.add('window', 'grid');
    grid.style.display = 'none';
    document.body.appendChild(grid);
    const char = charWidthHeight(window.document, grid);
    document.body.removeChild(grid);

    const card = window.document.querySelector<HTMLElement>('.card')!;
    const maxWidth = Math.min(window.innerWidth, card.offsetWidth);
    const maxHeight = window.innerHeight / 2;

    const width = Math.floor(maxWidth / char.width);
    const height = Math.floor(maxHeight / char.height);

    return {width, height};
}