import type {WorkflowRunner} from "../workflows/mod.ts";

interface WorkflowBinding {
    create(options: { params: unknown }): Promise<WorkflowInstance>;
}

interface WorkflowInstance {
    id: string;
    status(): Promise<InstanceStatus>;
}

interface InstanceStatus {
    status: string;
    error?: { name: string; message: string };
    output?: unknown;
}

const terminalErrors = new Set(['errored', 'terminated']);

export class CloudflareWorkflowRunner<Params, Result> implements WorkflowRunner<Params, Result> {
    constructor(private binding: WorkflowBinding, private pollIntervalMs = 500) {
    }

    async run(params: Params): Promise<Result> {
        const instance = await this.binding.create({params});

        while (true) {
            const {status, output, error} = await instance.status();
            if (status === 'complete') return output as Result;
            if (terminalErrors.has(status)) throw new Error(error?.message ?? `Workflow ${status}`);
            await new Promise(r => setTimeout(r, this.pollIntervalMs));
        }
    }
}
