export class Arrays {
    static shuffle<T>(array: ReadonlyArray<T>): Array<T> {
        return array.map((value) => ({ value, order: Math.random() }))
            .sort((a, b) => a.order - b.order)
            .map(({ value }) => value);
    }

    static unique<T>(array: ReadonlyArray<T>): Array<T> {
        return Array.from(new Set(array));
    }
}