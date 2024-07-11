export function binPack(parent: HTMLElement) {
    const children = Array.from(parent.children) as HTMLElement[];
    children.sort((a, b) => b.offsetWidth - a.offsetWidth);
    children.forEach(child => parent.appendChild(child));
    checkFits(parent.children[0] as HTMLElement)
}

function sameLine(a: HTMLElement, b: HTMLElement): boolean {
    return a.offsetTop === b.offsetTop;
}

function checkFits(current: HTMLElement | undefined): undefined {
    if (!current) return;
    const next = current.nextElementSibling as HTMLElement;
    if (!next) return;
    if (!sameLine(current, next)) findNextBestFit(current, next);
    return checkFits(next);
}

function findNextBestFit(current: HTMLElement, doesNotFit: HTMLElement) {
    const mightFit = doesNotFit.nextElementSibling as HTMLElement;
    if (!mightFit) return;
    current.after(mightFit);
    if (sameLine(current, mightFit)) return checkFits(mightFit);
    doesNotFit.after(mightFit);
    return findNextBestFit(current, mightFit)
}