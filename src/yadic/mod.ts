export type Dependency<K extends PropertyKey, V> = {
    readonly [P in K]: V;
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

export type Overwrite<T, U> = Omit<T, keyof U> & U;

export type Chain<T extends any[]> = T extends [infer First, ...infer Rest]
    ? Overwrite<Chain<Rest>, First>
    : {};

export function chain<T extends object[]>(...objects: T): Chain<T> {
    return new Proxy({}, {
        get(_target, prop, _receiver) {
            for (const obj of objects) {
                if (prop in obj) return Reflect.get(obj, prop, obj);
            }
        }
    }) as Chain<T>
}

export class LazyMap {
    private deps: this;

    private constructor(parent?: LazyMap) {
        this.deps = parent ? chain(this, parent) : this;
    }

    static create<P extends LazyMap>(parent?: P): LazyMap & P {
        return new LazyMap(parent as any) as any;
    }

    set<K extends PropertyKey, V>(key: K, fun: (deps: this) => V): this & Dependency<K, V> {
        const self = this;
        return Object.defineProperty(this, key, {
            get: function () {
                const value = fun(self.deps);
                Object.defineProperty(this, key, {value, configurable: false});
                return value;
            },
            configurable: true,
            enumerable: true
        }) as any;
    }

    decorate<K extends keyof this, V>(key: K, fun: (deps: this) => V): this & Dependency<K, V> {
        const p = Object.getOwnPropertyDescriptor(this, key);
        if (!p) throw new Error(`No previous key for '${String(key)}' found`);
        delete this[key];
        return this.set(String(key), deps => {
            return fun(chain(Object.defineProperty({}, key, p), deps));
        }) as any;
    }
}

export function alias<T extends object, K extends keyof T>(key: K) {
    return (deps: T) => Reflect.get(deps, key);
}

export function instance<T>(value: T) {
    return () => value;
}

export function constructor<D, T>(valueConstructor: Constructor<T> | AutoConstructor<D, T>) {
    if (!isConstructor(valueConstructor)) throw new Error(`${valueConstructor.name} is not a constructor`);
    if (valueConstructor.length === 0) { // @ts-ignore
        return () => new valueConstructor();
    }
    if (valueConstructor.length === 1) return (deps: D) => new valueConstructor(deps);
    throw new Error(`${valueConstructor.name} must take either no arguments or a dependency object. Use set() with function for other use cases`);
}