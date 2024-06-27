export interface Clock {
    now(): Date
}

export class SystemClock implements Clock {
    now(): Date {
        return new Date();
    }
}

export class StoppedClock implements Clock {
    constructor(private readonly value: Date) {
    }

    now(): Date {
        return this.value;
    }

    increment(milliseconds: number): Date {
        this.value.setTime(this.value.getTime() + milliseconds);
        return this.value;
    }
}