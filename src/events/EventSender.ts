export interface EventSender {
    send(event: object): Promise<any>;
}