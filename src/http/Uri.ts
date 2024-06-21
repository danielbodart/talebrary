/**
 * Uri class based on {@link https://tools.ietf.org/html/rfc3986 RFC 3986}
 */
export class Uri {
    /** {@link https://tools.ietf.org/html/rfc3986#appendix-B } */
    static RFC_3986 = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/;
    scheme?: string;
    authority?: string;
    path: string;
    query?: string;
    fragment?: string;

    constructor(value: string) {
        const match = Uri.RFC_3986.exec(value);
        if (!match) throw new Error(`Invalid Uri: ${value}`);
        const [, , scheme, , authority, path, , query, , fragment] = match;
        this.scheme = scheme;
        this.authority = authority;
        this.path = path;
        this.query = query;
        this.fragment = fragment;
    }

    /** {@link https://tools.ietf.org/html/rfc3986#section-5.3} */
    toString() {
        const result: string[] = [];

        if (typeof this.scheme != 'undefined') result.push(this.scheme, ":");
        if (typeof this.authority != 'undefined') result.push("//", this.authority);
        result.push(this.path);
        if (typeof this.query != 'undefined') result.push("?", this.query);
        if (typeof this.fragment != 'undefined') result.push("#", this.fragment);
        return result.join('');
    }

    toJSON() {
        return this.toString();
    }
}