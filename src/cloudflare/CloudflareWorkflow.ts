import type { Params } from "@cloudflare/workers-types";
import type {Env} from "../Application.ts";
// @ts-ignore
import {WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep} from "cloudflare:workers";


export class CloudflareWorkflow extends WorkflowEntrypoint<Env, Params> {
    async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
        console.log('run', event.payload, event.instanceId, event.timestamp);
        await step.do('my first step', async () => {
            console.log('do');
        });
    }
}