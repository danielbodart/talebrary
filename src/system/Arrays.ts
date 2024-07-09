export class Arrays {
    static shuffle<T>(array: ReadonlyArray<T>): Array<T> {
        return array.map((value) => ({ value, order: Math.random() }))
            .sort(by('order'))
            .map(({ value }) => value);
    }

    static unique<T>(array: ReadonlyArray<T>): Array<T> {
        return Array.from(new Set(array));
    }
}



export type Mapper<A, B> = (a: A) => B;
export type Comparator<A> = (a: A, b: A) => number;

export function ascending<T>(a: T, b: T) {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
}

export function descending<T>(a: T, b: T): number {
    if (a < b) return 1;
    if (a > b) return -1;
    return 0;
}


export function by<A, K extends keyof A>(key: K, comparator?: Comparator<A[K]>): Comparator<A>;
export function by<A, K>(mapper: Mapper<A, K>, comparator?: Comparator<K>): Comparator<A>;
export function by(mapperOfKey: any, comparator: Comparator<any> = ascending): Comparator<any> {
    if (typeof mapperOfKey === "function") return byFn(mapperOfKey, comparator);
    return byKey(mapperOfKey, comparator);
}

function byKey<A, K extends keyof A>(key: K, comparator: Comparator<A[K]> = ascending): Comparator<A> {
    return (a: A, b: A) => {
        return comparator(a[key], b[key]);
    }
}

function byFn<A, K>(mapper: Mapper<A, K>, comparator: Comparator<K> = ascending): Comparator<A> {
    return (a: A, b: A) => {
        return comparator(mapper(a), mapper(b));
    }
}
