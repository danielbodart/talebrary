export interface CollapsedSuggestion {
    text: string;
    completions: string[];
}

export function collapseSuggestions(suggestions: string[]): CollapsedSuggestion[] {
    const groups = new Map<string, string[]>();
    const singles: string[] = [];

    for (const suggestion of suggestions) {
        const spaceIndex = suggestion.indexOf(' ');
        if (spaceIndex === -1) {
            singles.push(suggestion);
            continue;
        }
        const prefix = suggestion.substring(0, spaceIndex);
        const rest = suggestion.substring(spaceIndex + 1);
        const existing = groups.get(prefix);
        if (existing) {
            existing.push(rest);
        } else {
            groups.set(prefix, [rest]);
        }
    }

    const result: CollapsedSuggestion[] = [];

    for (const [prefix, completions] of groups) {
        if (completions.length === 1) {
            result.push({text: `${prefix} ${completions[0]}`, completions: []});
        } else {
            result.push({text: `${prefix}...`, completions});
        }
    }

    for (const single of singles) {
        // Skip single words that are already represented as a prefix group
        if (!groups.has(single)) {
            result.push({text: single, completions: []});
        }
    }

    return result;
}
