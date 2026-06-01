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

export class Critique<T> extends Error {
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
    public static from<T>(value: T): Critique<T>;
    public static from(): Critique<void>;
    public static from<T>(value?: T): Critique<T> {
        return new Critique(value as T);
    }
}

export class Rebuttal<T> extends Error {
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
    public static from<T>(value: T): Rebuttal<T>;
    public static from(): Rebuttal<void>;
    public static from<T>(value?: T): Rebuttal<T> {
        return new Rebuttal(value as T);
    }
}
