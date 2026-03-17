import { Rejection, Opposition } from './exceptions.ts';



export interface Optimization<draft> extends AsyncGenerator<draft, never, never> {
    next(...values: [] | [never]): Promise<IteratorResult<draft, never>>;
    /**
     * @throws {@link Opposition}
     */
    throw(e: Rejection): Promise<IteratorResult<draft, never>>;
}
export namespace Optimization {
    export interface Cache<draft> extends AsyncGenerator<draft, never, void> {
        next(...values: [] | [void]): Promise<IteratorResult<draft, never>>;
        /**
        * @throws {@link Opposition}
        */
        throw(e: Rejection): Promise<IteratorResult<draft, never>>;
    }
    export namespace Cache {
        /**
         * @param raw0 Ownership transferred.
         */
        export async function *from<draft>(raw0: Optimization<draft>): Optimization.Cache<draft> {
            await using raw = raw0;
            let draft = await raw.next().then(r => r.value);
            let output = Promise.resolve(draft);
            for (;;) try {
                yield output;
                output = Promise.resolve(draft);
            } catch (e) {
                if (e instanceof Rejection) {} else throw e;
                try {
                    draft = await raw.throw(e).then(r => r.value);
                    output = Promise.resolve(draft);
                } catch (e) {
                    if (e instanceof Opposition) {} else throw e;
                    output = Promise.reject(e);
                }
            }
        }
    }

    export interface Snapshot<draft> extends AsyncGenerator<draft, never, void> {
        next(...values: [] | [void]): Promise<IteratorResult<draft, never>>;
        /**
        * @throws {@link Rejection}
        */
        throw(e: Rejection): Promise<never>;
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
                    await opt.throw(e).then(r => r.value);
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
            draft: output,
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



export interface Evaluation<input, output = input> extends AsyncGenerator<output, never, input> {
    /**
     * @throws {@link FirstYield}
     */
    next(...values: []): Promise<IteratorResult<output, never>>;
    /**
     * @throws {@link Rejection}
     */
    next(...values: [input]): Promise<IteratorResult<output, never>>;
    /**
     * @throws {@link Rejection}
     */
    throw(e: Opposition): Promise<IteratorResult<output, never>>;
}
export namespace Evaluation {
    export class FirstYield {}
    export interface Initialized<input, output = input> extends AsyncGenerator<output, never, input> {
        /**
         * @throws {@link Rejection}
         */
        next(...values: [input]): Promise<IteratorResult<output, never>>;
        /**
         * @throws {@link Rejection}
         */
        throw(e: Opposition): Promise<IteratorResult<output, never>>;
    }
    export namespace Initialized {
        /**
         * @param eva Ownership transferred.
         */
        export async function from<input, output = input>(eva: Evaluation<input, output>): Promise<Evaluation.Initialized<input, output>> {
            try {
                throw new Error(undefined, { cause: await eva.next() });
            } catch (e) {
                if (e instanceof Evaluation.FirstYield) return eva;
                else throw e;
            }
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
    try {
        const output = await eva.next(draft).then(r => r.value);
        return Optimization.Snapshot.recover(opt, output);
    } catch (e) {
        if (e instanceof Rejection) {} else throw e;
        for (let rejection = e;;) try {
            await opt.throw(rejection); // Either Opposition or Rejection thrown outgoing from opt.
        } catch (e) {
            if (e instanceof Opposition) {} else throw e;
            try {
                const output = await eva.throw(e).then(r => r.value);
                return Optimization.Snapshot.recover(opt, output);
            } catch (e) {
                if (e instanceof Rejection) {} else throw e;
                rejection = e;
            }
        }
    }
}
