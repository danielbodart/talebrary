import type {Score, EvalCase} from "../types.ts";
import type {SceneDetectionCase} from "../fixtures.ts";

/** Did the LLM return a prompt (not a 404)? */
export function hasPrompt(output: any): Score {
    if (output?.prompt && typeof output.prompt === "string") {
        return {name: "has-prompt", value: 1};
    }
    return {name: "has-prompt", value: 0, reason: output?.reason ?? "no prompt field"};
}

/** Does the prompt/404 decision match what we expected? */
export function matchesExpectation(output: any, evalCase: EvalCase<SceneDetectionCase>): Score {
    const gotPrompt = !!(output?.prompt && typeof output.prompt === "string");
    const expected = evalCase.input.expectScene;

    if (gotPrompt === expected) {
        return {name: "matches-expectation", value: 1};
    }
    return {
        name: "matches-expectation",
        value: 0,
        reason: expected
            ? `expected prompt, got 404: ${output?.reason ?? "unknown"}`
            : `expected 404, got prompt: "${(output?.prompt as string)?.slice(0, 60)}..."`,
    };
}
