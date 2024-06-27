export interface EventSender {
    send(event: object): Promise<any>;
    sendBatch(batch: object[]): Promise<any>;
}