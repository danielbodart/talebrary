export type Dependency<K extends PropertyKey, V> = {
    [P in K]: V;
}

export interface AutoConstructor<D, T> {
    new(deps: D): T
}

export interface Constructor<T> {
    new(): T
}

export function isConstructor(func: Function): boolean {
    return !!func.prototype && func.prototype.constructor === func;
}

export class LazyMap {
    constructor(parent?: object) {
        if (parent) Object.setPrototypeOf(this, parent);
        Object.freeze(this);
    }

    set<K extends PropertyKey, V>(key: K, fun: (deps: this) => V): this & Dependency<K, V> {
        const parent = this;
        const self = this.clone();
        return Object.preventExtensions(Object.defineProperty(self, key, {
            get: () => {
                const value = fun(parent);
                Object.freeze(Object.defineProperty(self, key, {value}));
                return value;
            },
            configurable: true,
        })) as any;
    }

    clone(): this {
        return Object.setPrototypeOf({}, this);
    }

    setInstance<K extends PropertyKey, V>(key: K, value: V): this & Dependency<K, V> {
        return Object.freeze(Object.defineProperty(this.clone(), key, {value})) as any;
    }

    setConstructor<K extends string, V>(key: K, valueConstructor: Constructor<V> | AutoConstructor<this, V>): this & Dependency<K, V> {
        if (!isConstructor(valueConstructor)) throw new Error(`${valueConstructor.name} is not a constructor`);
        if (valueConstructor.length === 0) { // @ts-ignore
            return this.set(key, () => new valueConstructor());
        }
        if (valueConstructor.length === 1) return this.set(key, deps => new valueConstructor(deps));
        throw new Error(`${valueConstructor.name} must take either no arguments or a dependency object. Use set() with function for other use cases`);
    }

    decorate<K extends keyof this, V>(key: K, fun: (deps: this) => V): /* Omit<this, K> */this & Dependency<K, V> {
        if (!(key in this)) throw new Error(`No previous key for '${String(key)}' found`);
        return this.set(key, fun);
    }
}