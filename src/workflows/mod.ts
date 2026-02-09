export interface Step {
    do<T>(name: string, fn: () => Promise<T>): Promise<T>;
}

export type Workflow<Params, Result> = (params: Params, step: Step) => Promise<Result>;

export interface WorkflowRunner<Params, Result> {
    run(params: Params): Promise<Result>;
}

export class InMemoryStep implements Step {
    readonly results = new Map<string, unknown>();

    async do<T>(name: string, fn: () => Promise<T>): Promise<T> {
        const result = await fn();
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
