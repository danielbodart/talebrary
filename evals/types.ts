export interface EvalCase<I> {
    name: string;
    input: I;
}

export interface Score {
    name: string;
    value: number; // 0-1
    reason?: string;
}

export type Scorer<O> = (output: O, evalCase: EvalCase<any>) => Score | Promise<Score>;

export interface ModelOutput<O> {
    model: string;
    output: O;
    latencyMs: number;
    cached: boolean;
    prompt?: string;
}

export interface CaseResult<I, O> {
    case: EvalCase<I>;
    results: ModelOutput<O>[];
    scores: Record<string, Score[]>; // model -> scores
    humanScores?: Record<string, number>; // model -> 1-5 rating
}

export interface EvalRun<I, O> {
    name: string;
    timestamp: number;
    cases: CaseResult<I, O>[];
}
