export class Arrays {
    static shuffle<T>(array: ReadonlyArray<T>): Array<T> {
        const result: T[] = [];
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [array[j], array[i]];
        }
        return result;
    }
}
