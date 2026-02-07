import {extractText} from "../../src/types.ts";
import type {Score} from "../types.ts";

export function jsonValid(output: any): Score {
    const text = extractText(output);
    if (!text) return {name: "json-valid", value: 0, reason: "no response text"};
    try {
        JSON.parse(text);
        return {name: "json-valid", value: 1};
    } catch (e) {
        return {name: "json-valid", value: 0, reason: String(e)};
    }
}

export function schemaMatch(requiredKeys: string[]): (output: any) => Score {
    return (output: any) => {
        const text = extractText(output);
        if (!text) return {name: "schema-match", value: 0, reason: "no response text"};
        try {
            const parsed = JSON.parse(text);
            const present = requiredKeys.filter(k => k in parsed);
            return {
                name: "schema-match",
                value: present.length / requiredKeys.length,
                reason: present.length === requiredKeys.length
                    ? undefined
                    : `missing: ${requiredKeys.filter(k => !(k in parsed)).join(", ")}`,
            };
        } catch {
            return {name: "schema-match", value: 0, reason: "invalid JSON"};
        }
    };
}

export function fieldPresence(expectedKeys: string[]): (output: any) => Score {
    return (output: any) => {
        const text = extractText(output);
        if (!text) return {name: "field-presence", value: 0, reason: "no response text"};
        try {
            const parsed = JSON.parse(text);
            const present = expectedKeys.filter(k => k in parsed);
            return {
                name: "field-presence",
                value: present.length / expectedKeys.length,
            };
        } catch {
            return {name: "field-presence", value: 0, reason: "invalid JSON"};
        }
    };
}
