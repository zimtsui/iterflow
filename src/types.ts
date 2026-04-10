const NOMINAL = Symbol();

export class Draft<T> {
    protected declare [NOMINAL]: never;
    protected constructor(protected value: T) {}
    public [Symbol.toPrimitive](): never {
        throw new Error();
    }
    public extract(): T {
        return this.value;
    }
    public static from<T>(value: T): Draft<T>;
    public static from(): Draft<void>;
    public static from<T>(value?: T): Draft<T> {
        return new Draft(value as T);
    }
}

export class Rejection<T> extends Error {
    protected declare [NOMINAL]: never;
    protected constructor(public override cause: T) {
        super();
    }
    public [Symbol.toPrimitive](): never {
        throw new Error();
    }
    public extract(): T {
        return this.cause;
    }
    public static from<T>(value: T): Rejection<T>;
    public static from(): Rejection<void>;
    public static from<T>(value?: T): Rejection<T> {
        return new Rejection(value as T);
    }
}

export class Opposition<T> extends Error {
    protected declare [NOMINAL]: never;
    protected constructor(public override cause: T) {
        super();
    }
    public [Symbol.toPrimitive](): never {
        throw new Error();
    }
    public extract(): T {
        return this.cause;
    }
    public static from<T>(value: T): Opposition<T>;
    public static from(): Opposition<void>;
    public static from<T>(value?: T): Opposition<T> {
        return new Opposition(value as T);
    }
}
