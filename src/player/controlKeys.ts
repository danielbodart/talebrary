export function controlKeys(document: Document) {
    for (const event of ['keydown', 'keyup'] as const) {
        document.addEventListener(event, (e: KeyboardEvent) => {
            document.body.classList.toggle('ctrl', e.ctrlKey);
            document.body.classList.toggle('alt', e.altKey);
            document.body.classList.toggle('shift', e.shiftKey);
            document.body.classList.toggle('meta', e.metaKey);
        });
    }
}
