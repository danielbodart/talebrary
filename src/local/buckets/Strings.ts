export class Strings {
    static kebabCase(value: string): string {
        return Strings.delimiterCase(value, '-');
    }

    // static snakeCase(value: string): string {
    //     return Strings.delimiterCase(value, '_');
    // }

    static delimiterCase(value: string, delimiter: string): string {
        return value
            .replace(/([A-Z][a-z]+|\d+)/gm, `${delimiter}$1`)
            .replace(new RegExp(`^${delimiter}`), '')
            .toLowerCase();
    }
}