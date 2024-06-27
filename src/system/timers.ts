import {type Clock, SystemClock} from './clock.ts';

import type {Dependency} from "../yadic/mod.ts";

export interface Deadline {
    didTimeout: boolean;
    timeRemaining: () => number;
}

export interface Timers {
    task<R>(fun: () => Promise<R>): Promise<R>;

    delay(timeout: number): Promise<void>

    setTimeout(handler: (...args: any[]) => void, timeout: number): number;

    clearTimeout(handle: number): void;

    setInterval(handler: (...args: any[]) => void, timeout: number): number;

    clearInterval(handle: number): void;

    requestIdleCallback(
        handler: (deadline: Deadline) => void,
        opts?: { timeout: number },
    ): number;

    cancelIdleCallback(handle: number): void;
}

export class SystemTimers implements Timers {
    constructor(private deps: Dependency<'clock', Clock>) {
    }

    async task<R>(fun: () => Promise<R>): Promise<R> {
        await this.delay(0);
        return fun();
    }

    delay(timeout: number) {
        return new Promise<void>(resolve => {
            this.setTimeout(() => {
                resolve();
            }, timeout);
        });
    }

    setTimeout(handler: (...args: any[]) => void, timeout: number): number {
        // @ts-ignore
        return setTimeout(handler, timeout);
    }

    clearTimeout(handle: number) {
        clearTimeout(handle);
    }

    setInterval(handler: (...args: any[]) => void, timeout: number): number {
        // @ts-ignore
        return setInterval(handler, timeout);
    }

    clearInterval(handle: number) {
        clearInterval(handle);
    }

    requestIdleCallback(handler: (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void, options?: { timeout: number }): number {
        const timeout = options ? options.timeout : 1;
        let start = this.deps.clock.now().getTime() + timeout;
        const self = this;

        return this.setTimeout(() => {
            handler({
                didTimeout: false,
                timeRemaining() {
                    return Math.max(0, 50.0 - (self.deps.clock.now().getTime() - start));
                },
            });
        }, timeout);
    }

    cancelIdleCallback(handle: number): void {
        this.clearTimeout(handle);
    }
}

export type Handler = (...args: any[]) => void;

export type Type = 'interval' | 'timeout' | 'idle';

export interface Timer {
    handle: number
    handler: Handler
    type: Type
    timeout: number
    scheduled: Date;
}

export class ManualTimers implements Timers {
    private timers: Timer[] = [];
    private lastHandle: number = 0;

    constructor(private clock: Clock = new SystemClock()) {
    }

    async task<R>(fun: () => Promise<R>): Promise<R> {
        await this.delay(0);
        return fun();
    }

    delay(timeout: number){
        return new Promise<void>(resolve => {
            this.setTimeout(() => {
                resolve();
            }, timeout);
        });
    }

    setTimeout(handler: (...args: any[]) => void, timeout: number): number {
        return this.createTimer(timeout, handler, 'timeout');
    }

    clearTimeout(handle: number): void {
        this.clearInterval(handle);
    }

    setInterval(handler: (...args: any[]) => void, timeout: number): number {
        return this.createTimer(timeout, handler, 'interval');
    }

    clearInterval(handle: number): void {
        this.timers = this.timers.filter(t => t.handle != handle);
    }

    requestIdleCallback(handler: (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void, { timeout }: { timeout: number } = { timeout: 50 }): number {
        return this.createTimer(timeout, handler, 'interval');
    }

    cancelIdleCallback(handle: number): void {
        this.timers = this.timers.filter(t => t.handle != handle);
    }

    runNext(): Timer | undefined {
        this.timers = this.timers.sort((a, b) => b.scheduled.getTime() - a.scheduled.getTime());
        const next = this.timers.pop();
        if (!next) return;
        next.handler();
        if (next.type === 'interval') {
            this.createTimer(next.timeout, next.handler, next.type, next.handle);
        }
        return next;
    }

    runAll(): Timer[] {
        const result: Timer[] = [];
        let next;
        while (next = this.runNext()) {
            result.push(next);
        }
        return result;
    }

    private createTimer(timeout: number, handler: (...args: any[]) => void, type: Type, handle = this.nextHandle()) {
        const scheduled = new Date(this.clock.now().getTime() + timeout);
        this.timers.push({ handler, timeout, type: type, handle, scheduled });
        return handle;
    }

    private nextHandle() {
        return ++this.lastHandle;
    }

}
