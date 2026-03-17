import { Rejection, Opposition } from './exceptions.ts';



export interface Optimization<draft> extends AsyncGenerator<Awaited<draft> | Opposition, never, never> {
    next(...values: [] | [never]): Promise<IteratorYieldResult<Awaited<draft>>>;
    throw(e: Rejection): Promise<IteratorYieldResult<Awaited<draft> | Opposition>>;
}
export namespace Optimization {
    export interface Raw<draft> extends AsyncGenerator<Awaited<draft> | Opposition, never, never> {}
    /**
     * @param raw0 Ownership transferred.
     */
    export function ensure<draft>(raw0: Optimization.Raw<draft>): Optimization<draft> {
        return {
            async next(...values) {
                const result = await raw0.next(...values);
                if (result.done) throw new Error(undefined, { cause: result });
                const output = result.value;
                if (output instanceof Opposition) throw new Error(undefined, { cause: output });
                return { value: output, done: false };
            },
            async throw(e) {
                const result = await raw0.throw(e);
                if (result.done) throw new Error();
                return { value: result.value, done: false };
            },
            return(value) {
                return raw0.return(value);
            },
            [Symbol.asyncIterator]() {
                return this;
            },
            [Symbol.asyncDispose]() {
                return raw0[Symbol.asyncDispose]();
            },
        };
    }

    export interface Cache<draft> extends AsyncGenerator<Awaited<draft> | Opposition, never, void> {
        next(...values: [] | [void]): Promise<IteratorYieldResult<Awaited<draft>>>;
        throw(e: Rejection): Promise<IteratorYieldResult<Awaited<draft> | Opposition>>;
    }
    export namespace Cache {
        export interface Raw<draft> extends AsyncGenerator<Awaited<draft> | Opposition, never, void> {}
        /**
         * @param raw0 Ownership transferred.
         */
        export function ensure<draft>(raw0: Optimization.Cache.Raw<draft>): Optimization.Cache<draft> {
            return {
                async next(...values) {
                    const result = await raw0.next(...values);
                    if (result.done) throw new Error(undefined, { cause: result });
                    const output = result.value;
                    if (output instanceof Opposition) throw new Error(undefined, { cause: output });
                    return { value: output, done: false };
                },
                async throw(e) {
                    const result = await raw0.throw(e);
                    if (result.done) throw new Error(undefined, { cause: result });
                    return { value: result.value, done: false };
                },
                return(value) {
                    return raw0.return(value);
                },
                [Symbol.asyncIterator]() {
                    return this;
                },
                [Symbol.asyncDispose]() {
                    return raw0[Symbol.asyncDispose]();
                },
            };
        }

        /**
         * @param raw0 Ownership transferred.
         */
        export function from<draft>(raw0: Optimization.Raw<draft>): Optimization.Cache<draft> {
            /**
             * @param raw0 Ownership transferred.
             */
            async function *from<draft>(raw0: Optimization<draft>): Optimization.Cache.Raw<draft> {
                await using raw = Optimization.ensure(raw0);
                let draft = await raw.next().then(r => r.value);
                let output: Awaited<draft> | Opposition = draft;
                for (;;) try {
                    yield output;
                    output = draft;
                } catch (e) {
                    if (e instanceof Rejection) {} else throw e;
                    output = await raw.throw(e).then(r => r.value);
                    if (output instanceof Opposition) {} else draft = output;
                }
            }
            return Optimization.Cache.ensure(from(Optimization.ensure(raw0)));
        }
    }

    export interface Snapshot<draft> extends AsyncGenerator<Awaited<draft> | Opposition, never, void> {
        next(...values: [] | [void]): Promise<IteratorYieldResult<Awaited<draft>>>;
        /**
        * @throws {@link Rejection}
        */
        throw(e: Rejection): Promise<IteratorYieldResult<Opposition>>;
    }
    export namespace Snapshot {
        /**
         * @param opt Ownership NOT transferred.
         */
        export function from<draft>(opt: Optimization.Cache<draft>): Optimization.Snapshot<draft> {
            return {
                next(...values) {
                    return opt.next(...values);
                },
                async throw(e: Rejection) {
                    const output = await opt.throw(e).then(r => r.value);
                    if (output instanceof Opposition) return { value: output, done: false };
                    throw e;
                },
                return(value) {
                    return opt.return(value);
                },
                [Symbol.asyncIterator]() {
                    return this;
                },
                async [Symbol.asyncDispose]() {},
            };
        }

        /**
         * @param opt Ownership NOT transferred.
         */
        export function recover<input, output>(
            opt: Optimization.Snapshot<input>,
            draft: Awaited<output>,
        ): Optimization.Snapshot<output> {
            return {
                async next(...values) {
                    return { value: draft, done: false };
                },
                throw(e) {
                    return opt.throw(e);
                },
                async return(value) {
                    await opt.return(undefined as any);
                    return { value: await value, done: true };
                },
                [Symbol.asyncIterator]() {
                    return this;
                },
                async [Symbol.asyncDispose]() {},
            };
        }
    }
}



export interface Evaluation<input, output = input> extends AsyncGenerator<Awaited<output> | Rejection, never, input> {
    next(...values: []): Promise<IteratorYieldResult<Evaluation.FirstYield>>;
    next(...values: [input]): Promise<IteratorYieldResult<Awaited<output> | Rejection>>;
    throw(e: Opposition): Promise<IteratorYieldResult<Awaited<output> | Rejection>>;
}
export namespace Evaluation {
    export interface Raw<input, output = input> extends AsyncGenerator<Awaited<output> | Rejection | FirstYield, never, input> {}
    /**
     * @param raw0 Ownership transferred.
     */
    export function ensure<input, output = input>(raw0: Evaluation.Raw<input, output>): Evaluation<input, output> {
        function next(...values: []): Promise<IteratorYieldResult<Evaluation.FirstYield>>;
        function next(...values: [input]): Promise<IteratorYieldResult<Awaited<output> | Rejection>>;
        async function next(...values: [] | [input]): Promise<IteratorYieldResult<Evaluation.FirstYield | Awaited<output> | Rejection>> {
            if (values.length) {
                const result = await raw0.next(...values);
                if (result.done) throw new Error(undefined, { cause: result });
                const output = result.value;
                if (output instanceof Evaluation.FirstYield) throw new Error(undefined, { cause: output });
                return { value: result.value, done: false };
            } else {
                const result = await raw0.next();
                if (result.done) throw new Error(undefined, { cause: result });
                const output = result.value;
                if (output instanceof Evaluation.FirstYield) return { value: output, done: false };
                throw new Error(undefined, { cause: output });
            }
        }
        return {
            next,
            async throw(e) {
                const result = await raw0.throw(e);
                if (result.done) throw new Error(undefined, { cause: result });
                const output = result.value;
                if (output instanceof Evaluation.FirstYield) throw new Error(undefined, { cause: output });
                return { value: output, done: false };
            },
            async return(value) {
                const result = await raw0.return(value);
                if (result.done) return { value: await value, done: true };
                const output = result.value;
                if (output instanceof Evaluation.FirstYield) throw new Error(undefined, { cause: output });
                return { value: output, done: false };
            },
            [Symbol.asyncIterator]() {
                return this;
            },
            [Symbol.asyncDispose]() {
                return raw0[Symbol.asyncDispose]();
            },
        };
    }


    export class FirstYield {}
    export interface Initialized<input, output = input> extends AsyncGenerator<Awaited<output> | Rejection, never, input> {
        next(...values: [input]): Promise<IteratorResult<Awaited<output> | Rejection, never>>;
        throw(e: Opposition): Promise<IteratorResult<Awaited<output> | Rejection, never>>;
    }
    export namespace Initialized {
        /**
         * @param raw0 Ownership transferred.
         */
        export async function from<input, output = input>(raw0: Evaluation.Raw<input, output>): Promise<Evaluation.Initialized<input, output>> {
            const eva = Evaluation.ensure(raw0);
            await eva.next().then(r => r.value);
            return eva;
        }
    }
}



/**
 * @throws {@link Rejection}
 */
export async function opteva<input, output>(
    opt: Optimization.Snapshot<input>,
    eva: Evaluation.Initialized<input, output>,
): Promise<Optimization.Snapshot<output>> {
    const draft = await opt.next().then(r => r.value);
    for (let output = await eva.next(draft).then(r => r.value);;) {
        if (output instanceof Rejection) {} else return Optimization.Snapshot.recover(opt, output);
        const input = await opt.throw(output).then(r => r.value);
        output = await eva.throw(input).then(r => r.value);
    }
}
