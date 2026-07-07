import {describe, expect, test} from "bun:test";
import {CloudflarePipelineAdapter, toRecord, type RecordSink, type TranscriptRecord} from "../../src/events/CloudflarePipelineAdapter.ts";
import type {TranscriptStanza} from "@bodar/wasiglk";

function stanza(overrides: Partial<TranscriptStanza> = {}): TranscriptStanza {
    return {
        format: 'glkote',
        input: {type: 'line', gen: 1, window: 2, value: 'go north'},
        output: {
            type: 'update',
            content: [
                {id: 2, text: [{content: ['You are in a ', {text: 'kitchen', style: 'emphasized'}, '.']}]},
                {id: 1, lines: [{line: 0, content: [{text: 'Kitchen', style: 'header'}]}]},
            ],
        },
        sessionId: 'sess-1',
        label: 'zork',
        timestamp: 1000,
        outtimestamp: 1200,
        ...overrides,
    } as TranscriptStanza;
}

class CapturingSink implements RecordSink {
    public batches: TranscriptRecord[][] = [];
    async send(records: TranscriptRecord[]) { this.batches.push(records); }
}

describe("CloudflarePipelineAdapter", () => {
    const at = () => 5000;

    test("maps a stanza batch to records, assigning seq and received_at", async () => {
        const sink = new CapturingSink();
        const adapter = new CloudflarePipelineAdapter(sink, at);

        await adapter.send({stanzas: [stanza(), stanza({sessionId: 'sess-1'})], seqStart: 7});

        expect(sink.batches.length).toBe(1);
        const [a, b] = sink.batches[0];
        expect(a.seq).toBe(7);
        expect(b.seq).toBe(8);
        expect(a.received_at).toBe(5000);
        expect(a.session_id).toBe('sess-1');
        expect(a.game_id).toBe('zork');
    });

    test("extracts input and output hot columns, keeps raw json", () => {
        const record = toRecord(stanza(), 0, 5000);
        expect(record.input_type).toBe('line');
        expect(record.input_text).toBe('go north');
        expect(record.output_text).toBe('You are in a kitchen.\nKitchen');
        expect(record.input_at).toBe(1000);
        expect(record.output_at).toBe(1200);
        expect(record.input).toEqual({type: 'line', gen: 1, window: 2, value: 'go north'});
        expect((record.output as any).type).toBe('update');
    });

    test("input_text is null for non-value inputs (timer/init)", () => {
        const record = toRecord(stanza({input: {type: 'timer'} as any}), 0, 5000);
        expect(record.input_type).toBe('timer');
        expect(record.input_text).toBeNull();
    });

    test("ignores non-transcript events (page views etc.)", async () => {
        const sink = new CapturingSink();
        const adapter = new CloudflarePipelineAdapter(sink, at);

        await adapter.send({type: 'page_view', page: '/content/123'});

        expect(sink.batches.length).toBe(0);
    });

    test("does not send an empty batch", async () => {
        const sink = new CapturingSink();
        const adapter = new CloudflarePipelineAdapter(sink, at);

        await adapter.send({stanzas: [], seqStart: 0});

        expect(sink.batches.length).toBe(0);
    });
});
