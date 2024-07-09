export const wordsPattern = /(\p{L}+\p{M}*|\p{N}+)/gu;

export function words(value: string | undefined): string[] {
    return value?.match(wordsPattern) || [];
}

export function wordCount(value: string): number {
    return words(value).length;
}

export const capitalWords = /\b\p{Lu}+\b(?:\s+\b\p{Lu}+\b)*/gu;