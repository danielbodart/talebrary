export function isEmpty(value: any): boolean {
    switch (typeof value) {
        case 'undefined' :
            return true;
        case 'string' :
            return value.trim() === '';
        case 'number' :
            return isNaN(value);
        case 'object' : {
            if (value == null) return true;
            if (Objects.isObject(value)) return Object.keys(value).length === 0;
            if (Array.isArray(value)) return value.length === 0;
        }
    }
    return false;
}

export class Objects {
    static isObject(value: any): value is Object {
        return value &&
            typeof value === 'object' &&
            (value.constructor === Object || /Object.*native/.test(value.constructor.toString()));
    }

    static removeEmpty<T extends object>(object: T): Partial<T> {
        if (!object) return object;
        if (Objects.isObject(object)) {
            return Object.keys(object).reduce((agg, key) => {
                // @ts-ignore
                const value = Objects.removeEmpty<T>(object[key]);
                if (!isEmpty(value)) {
                    // @ts-ignore
                    agg[key] = value;
                }
                return agg;
            }, {} as Partial<T>);
        }
        return object;
    };
}