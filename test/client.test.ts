import {describe, expect, test} from "bun:test";
import {client} from "../src/client/client.ts";
import {fileHandler} from "../src/local/FileHandler.ts";
import {type BaseMessage, type MessageHandler, NoLogger} from "../src/client/types.ts";

class CaptureMessage implements MessageHandler {
    public send?: (message: any) => void;
    private resolve?: (message: any) => void;

    received(): Promise<BaseMessage> {
        return new Promise<BaseMessage>((resolve) => {this.resolve = resolve})
    }

    postMessage<T extends BaseMessage>(message: T): void {
        if (!this.resolve) return;
        this.resolve(message);
    }

    onMessage<T extends BaseMessage>(fun: (message: T) => void): void {
        this.send = fun;
    }
}

describe("client", () => {
    test("can load an story", async () => {
        const messageHandler = new CaptureMessage();
        await client(`file://${import.meta.dir}/Floatpoint.gblorb`, "blorb/glulx", {} as any,
            messageHandler, `file://${import.meta.dir}/../www`, fileHandler, new NoLogger())
        messageHandler.send!({type: "init", gen: 0, metrics: {}});
        expect((await messageHandler.received()).type).toEqual('update')
    });
})
