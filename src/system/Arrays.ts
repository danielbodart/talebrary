export class Arrays {
    static shuffle<T>(array: ReadonlyArray<T>): Array<T> {
        return array.map((value) => ({ value, order: Math.random() }))
            .sort((a, b) => a.order - b.order)
            .map(({ value }) => value);
    }

    static unique<T>(array: ReadonlyArray<T>): Array<T> {
        return Array.from(new Set(array));
    }

    static zip<T extends any[]>(...arrays: T[]): Array<{ [K in keyof T]: T[K] extends (infer U)[] ? U : never }> {
        if (arrays.length === 0) return [];

        const minLength = Math.min(...arrays.map(arr => arr.length));
        const result: any[] = [];

        for (let i = 0; i < minLength; i++) {
            result.push(arrays.map(arr => arr[i]));
        }

        return result;
    }
}