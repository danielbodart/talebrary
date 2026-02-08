import type {Score} from "../types.ts";

export function jsonValid(output: any): Score {
    if (!output || typeof output !== 'object') return {name: "json-valid", value: 0, reason: "not an object"};
    return {name: "json-valid", value: 1};
}

export function schemaMatch(requiredKeys: string[]): (output: any) => Score {
    return (output: any) => {
        if (!output || typeof output !== 'object') return {name: "schema-match", value: 0, reason: "not an object"};
        const present = requiredKeys.filter(k => k in output);
        return {
            name: "schema-match",
            value: present.length / requiredKeys.length,
            reason: present.length === requiredKeys.length
                ? undefined
                : `missing: ${requiredKeys.filter(k => !(k in output)).join(", ")}`,
        };
    };
}

export function fieldPresence(expectedKeys: string[]): (output: any) => Score {
    return (output: any) => {
        if (!output || typeof output !== 'object') return {name: "field-presence", value: 0, reason: "not an object"};
        const present = expectedKeys.filter(k => k in output);
        return {
            name: "field-presence",
            value: present.length / expectedKeys.length,
        };
    };
}
