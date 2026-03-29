const NOMINAL = Symbol();

export class Draft<T> {
    protected declare [NOMINAL]: never;
    public constructor(protected value: T) {}
    public [Symbol.toPrimitive](): never {
        throw new Error();
    }
    public extract(): T {
        return this.value;
    }
}

export class Rejection<T> extends Error {
    protected declare [NOMINAL]: never;
    public constructor(public override cause: T) {
        super();
    }
    public [Symbol.toPrimitive](): never {
        throw new Error();
    }
    public extract(): T {
        return this.cause;
    }
}

export class Opposition<T> extends Error {
    protected declare [NOMINAL]: never;
    public constructor(public override cause: T) {
        super();
    }
    public [Symbol.toPrimitive](): never {
        throw new Error();
    }
    public extract(): T {
        return this.cause;
    }
}
