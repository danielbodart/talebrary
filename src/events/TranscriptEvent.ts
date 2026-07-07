import type {TranscriptStanza} from "@bodar/wasiglk";

/**
 * Wire format posted to `/events` by the player: a batch of raw wasiglk
 * transcript stanzas plus the session-relative sequence number of the first
 * stanza. The client is the only ordered vantage point, so it assigns `seq`;
 * the worker adapter extracts hot columns and stamps `received_at`.
 */
export interface TranscriptEvent {
    stanzas: TranscriptStanza[];
    seqStart: number;
}

export function isTranscriptEvent(event: unknown): event is TranscriptEvent {
    return event != null && typeof event === 'object'
        && Array.isArray((event as TranscriptEvent).stanzas)
        && typeof (event as TranscriptEvent).seqStart === 'number';
}
