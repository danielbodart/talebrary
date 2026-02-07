import type {CachedAi} from "../cache.ts";
import {judgeModel} from "../models.ts";
import type {Score} from "../types.ts";

interface VisionScores {
    scene_accuracy: number;
    artistic_quality: number;
    style_consistency: number;
}

export function visionJudge(ai: CachedAi, sceneDescription: string): (imageBytes: Uint8Array) => Promise<Score[]> {
    return async (imageBytes: Uint8Array): Promise<Score[]> => {
        const base64 = Buffer.from(imageBytes).toString("base64");
        const dataUri = `data:image/png;base64,${base64}`;

        const {output} = await ai.run(judgeModel, {
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
                },
            ],
            max_tokens: 256,
        });

        const text = typeof output === 'string' ? output : output?.response;
        if (!text) return [{name: "vision-judge", value: 0, reason: "no response"}];

        try {
            const scores: VisionScores = JSON.parse(text);
            return [
                {name: "scene-accuracy", value: (scores.scene_accuracy ?? 0) / 5},
                {name: "artistic-quality", value: (scores.artistic_quality ?? 0) / 5},
                {name: "style-consistency", value: (scores.style_consistency ?? 0) / 5},
            ];
        } catch {
            return [{name: "vision-judge", value: 0, reason: `unparseable: ${text.slice(0, 100)}`}];
        }
    };
}
