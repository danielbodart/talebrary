import type {TalebraryAi} from "../../src/ai/TalebraryAi.ts";
import {judgeModel} from "../models.ts";
import type {Score} from "../types.ts";

interface VisionScores {
    scene_accuracy: number;
    artistic_quality: number;
    style_consistency: number;
}

export function visionJudge(ai: TalebraryAi, sceneDescription: string): (imageBytes: Uint8Array) => Promise<Score[]> {
    return async (imageBytes: Uint8Array) => {
        const base64 = Buffer.from(imageBytes).toString("base64");
        const dataUri = `data:image/png;base64,${base64}`;

        const scores = await ai.generateText<VisionScores>(judgeModel, {
            messages: [
                {
                    role: "user",
                    content: [
                        {type: "image_url", image_url: {url: dataUri}},
                        {
                            type: "text",
                            text: `Rate this illustration for an interactive fiction game. Scene: ${sceneDescription}. Score 1-5 on: scene_accuracy, artistic_quality, style_consistency. Return only JSON: {"scene_accuracy": N, "artistic_quality": N, "style_consistency": N}`,
                        },
                    ],
                } as any,
            ],
            max_tokens: 256,
        });

        try {
            return [
                {name: "scene-accuracy", value: (scores.scene_accuracy ?? 0) / 5},
                {name: "artistic-quality", value: (scores.artistic_quality ?? 0) / 5},
                {name: "style-consistency", value: (scores.style_consistency ?? 0) / 5},
            ];
        } catch {
            return [{name: "vision-judge", value: 0, reason: `unparseable: ${JSON.stringify(scores).slice(0, 100)}`}];
        }
    };
}
