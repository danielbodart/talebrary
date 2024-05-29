export function debugProxy(name: string, target = {} as any): any {
    return new Proxy(target, {
        get(target: any, property: string | symbol, _receiver: any): any {
            if (property in target) return target[property];
            const child = `${name}.${String(property)}`;
            console.log('get', child);
            return debugProxy(child);
        },

        set(_target: any, property: string | symbol, newValue: any, _receiver: any): boolean {
            const child = `${name}.${String(property)}`;
            console.log('set', child, newValue);
            return debugProxy(child);
        },

        apply(_target: any, _this: any, args: any[]): any {
            const child = `${name}(` + args.join(', ') + ')';
            console.log('apply', child);
            return debugProxy(child);
        }
    });
}