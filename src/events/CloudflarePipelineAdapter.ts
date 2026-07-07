import type {EventSender} from "./EventSender.ts";
import type {TranscriptStanza} from "@bodar/wasiglk";
import {isTranscriptEvent} from "./TranscriptEvent.ts";

/** Structural view of a Cloudflare Pipelines stream binding (`env.TRANSCRIPTS`). */
export interface RecordSink {
    send(records: TranscriptRecord[]): Promise<unknown>;
}

/** One Iceberg row — see docs/transcripts-schema.json (schema is authoritative). */
export interface TranscriptRecord {
    session_id: string;
    game_id: string;
    seq: number;
    input_type: string;
    input_text: string | null;
    output_text: string;
    input_at: number;
    output_at: number;
    received_at: number;
    input: object;
    output: object;
}

/**
 * Maps player transcript batches onto the Iceberg record stream. Non-transcript
 * events (page views etc.) are ignored so the table stays single-schema.
 */
export class CloudflarePipelineAdapter implements EventSender {
    constructor(private sink: RecordSink, private now: () => number = Date.now) {
    }

    async send(event: object): Promise<void> {
        if (!isTranscriptEvent(event)) return;
        const receivedAt = this.now();
        const records = event.stanzas.map((stanza, i) => toRecord(stanza, event.seqStart + i, receivedAt));
        if (records.length > 0) await this.sink.send(records);
    }
}

export function toRecord(stanza: TranscriptStanza, seq: number, receivedAt: number): TranscriptRecord {
    const input = stanza.input as Record<string, unknown>;
    return {
        session_id: stanza.sessionId,
        game_id: stanza.label,
        seq,
        input_type: typeof input?.type === 'string' ? input.type : 'unknown',
        input_text: typeof input?.value === 'string' ? input.value : null,
        output_text: extractOutputText(stanza.output),
        input_at: stanza.timestamp,
        output_at: stanza.outtimestamp,
        received_at: receivedAt,
        input: stanza.input,
        output: stanza.output,
    };
}

/** Best-effort visible text from a RemGlk update; raw `output` is kept for replay. */
function extractOutputText(output: unknown): string {
    const content = (output as Record<string, any>)?.content;
    if (!Array.isArray(content)) return '';
    const lines: string[] = [];
    for (const win of content) {
        for (const para of win?.text ?? []) lines.push(spanText(para?.content));
        for (const gridLine of win?.lines ?? []) lines.push(spanText(gridLine?.content));
    }
    return lines.join('\n').trim();
}

function spanText(spans: unknown): string {
    if (!Array.isArray(spans)) return '';
    return spans.map(s => typeof s === 'string' ? s : (typeof s?.text === 'string' ? s.text : '')).join('');
}
