export type SupportedGameType =
    'zcode'
    | 'blorb/zcode'
    | 'glulx'
    | 'blorb/glulx'
    | 'hugo'
    | 'adrift'
    | 'tads2'
    | 'tads3';

export interface Describable {
    title: string;
    description: string;
}

export function isDescribable(value: any): value is Describable {
    return value && typeof value === 'object' &&
        'title' in value && typeof value.title === 'string' &&
        'description' in value && typeof value.description === 'string';
}

export interface SceneContext {
    story: Describable,
    scene: Describable,
    previous?: Describable
}