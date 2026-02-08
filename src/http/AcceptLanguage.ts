const englishCodes = ['en', 'en-us', 'en-gb'];

export function parseAcceptLanguage(header: string | null): string[] {
    if (!header) return englishCodes;

    const codes = header.split(',')
        .map(part => part.split(';')[0].trim().toLowerCase())
        .filter(code => code.length > 0)
        .flatMap(code => code.includes('-') ? [code, code.split('-')[0]] : [code]);

    const unique = [...new Set([...englishCodes, ...codes])];
    return unique;
}
