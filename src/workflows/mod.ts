export interface StepConfig {
    retries?: { limit: number; delay: string | number; backoff?: 'constant' | 'linear' | 'exponential' };
    timeout?: string | number;
}

export interface Step {
    do<T>(name: string, fn: () => Promise<T>): Promise<T>;
    do<T>(name: string, config: StepConfig, fn: () => Promise<T>): Promise<T>;
}

export type Workflow<Params, Result> = (params: Params, step: Step) => Promise<Result>;

export interface WorkflowRunner<Params, Result> {
    run(params: Params): Promise<Result>;
}

export class InMemoryStep implements Step {
    readonly results = new Map<string, unknown>();

    async do<T>(name: string, configOrFn: StepConfig | (() => Promise<T>), fn?: () => Promise<T>): Promise<T> {
        const callback = fn ?? configOrFn as () => Promise<T>;
        const result = await callback();
        this.results.set(name, result);
        return result;
    }
}

export class DirectRunner<Params, Result> implements WorkflowRunner<Params, Result> {
    constructor(private workflow: Workflow<Params, Result>) {
    }

    async run(params: Params): Promise<Result> {
        return this.workflow(params, new InMemoryStep());
    }
}
