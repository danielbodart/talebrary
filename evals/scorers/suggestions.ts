import {commands, extractText} from "../../src/types.ts";
import type {EvalCase, Score} from "../types.ts";
import type {Describable} from "../../src/types.ts";

function parseResponse(output: any): any | undefined {
    const text = extractText(output);
    if (!text) return undefined;
    try {
        return JSON.parse(text);
    } catch {
        return undefined;
    }
}

export function commandsFromList(output: any): Score {
    const parsed = parseResponse(output);
    if (!parsed?.commands) return {name: "commands-from-list", value: 0, reason: "no commands field"};
    const cmds: string[] = parsed.commands;
    if (cmds.length === 0) return {name: "commands-from-list", value: 0, reason: "empty commands"};
    const valid = cmds.filter(c => commands.includes(c));
    return {
        name: "commands-from-list",
        value: valid.length / cmds.length,
        reason: valid.length === cmds.length
            ? undefined
            : `invalid: ${cmds.filter(c => !commands.includes(c)).join(", ")}`,
    };
}

export function nounsFromScene(output: any, evalCase: EvalCase<Describable>): Score {
    const parsed = parseResponse(output);
    if (!parsed?.nouns) return {name: "nouns-from-scene", value: 0, reason: "no nouns field"};
    const nouns: string[] = parsed.nouns;
    if (nouns.length === 0) return {name: "nouns-from-scene", value: 0, reason: "empty nouns"};
    const description = evalCase.input.description.toLowerCase();
    const valid = nouns.filter(n => description.includes(n.toLowerCase()));
    return {
        name: "nouns-from-scene",
        value: valid.length / nouns.length,
        reason: valid.length === nouns.length
            ? undefined
            : `not in scene: ${nouns.filter(n => !description.includes(n.toLowerCase())).join(", ")}`,
    };
}

export function actionCount(output: any): Score {
    const parsed = parseResponse(output);
    if (!parsed?.actions) return {name: "action-count", value: 0, reason: "no actions field"};
    const count = parsed.actions.length;
    return {
        name: "action-count",
        value: count >= 2 && count <= 7 ? 1 : 0,
        reason: count < 2 ? `too few: ${count}` : count > 7 ? `too many: ${count}` : undefined,
    };
}
