export function pipe<i, TReturn, TNext, o>(
    generator: AsyncGenerator<i, TReturn, TNext>,
    f: (x: i) => Promise<o>,
): AsyncGenerator<o, TReturn, TNext> {
    return {
        async next(...values) {
            const r = await generator.next(...values);
            if (r.done) return { value: r.value, done: r.done };
            else return { value: await f(r.value), done: r.done };
        },
        async throw(e) {
            const r = await generator.throw(e);
            if (r.done) return { value: r.value, done: r.done };
            else return { value: await f(r.value), done: r.done };
        },
        async return(value) {
            const r = await generator.return(value);
            if (r.done) return { value: r.value, done: r.done };
            else return { value: await f(r.value), done: r.done };
        },
        [Symbol.asyncIterator]() {
            return this;
        },
        [Symbol.asyncDispose]() {
            return generator[Symbol.asyncDispose]();
        }
    };
}
