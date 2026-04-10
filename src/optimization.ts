import { Draft, Rejection, Opposition } from './types.ts';



export interface Optimization<
    in out draft, in out rejection, in out opposition,
> extends AsyncDisposable, Optimization.View<draft, rejection, opposition> {}


export namespace Optimization {

    /**
     * First yield must be a draft.
     */
    export type Generator<
        draft, rejection, opposition,
    > = AsyncGenerator<Draft<draft> | Opposition<opposition>, never, Rejection<rejection>>;


    /**
     * @param optgen Ownership transferred.
     */
    export function from<draft, rejection, opposition>(
        optgen: Optimization.Generator<draft, rejection, opposition>,
    ): Optimization<draft, rejection, opposition> {
        return new Instance(optgen);
    }

    class Instance<in out draft, in out rejection, in out opposition> implements Optimization<draft, rejection, opposition> {
        protected it: AsyncGenerator<Draft<draft> | Opposition<opposition>, never, Rejection<rejection> | void>;

        /**
        * @param optgen Ownership transferred.
        */
        public constructor(optgen: Optimization.Generator<draft, rejection, opposition>) {
            this.it = Instance.iterate(optgen);
        }

        public async repeat(): Promise<Draft<draft>> {
            const output = await this.it.next().then(r => r.value);
            if (output instanceof Draft) {} else throw new Error();
            return output;
        }

        public async reject(rejection: Rejection<rejection>): Promise<Draft<draft> | Opposition<opposition>> {
            return await this.it.next(rejection).then(r => r.value);
        }

        public async [Symbol.asyncDispose](): Promise<void> {
            await this.it[Symbol.asyncDispose]?.();
        }

        /**
         * @param optgen Ownership transferred.
         */
        protected static async *iterate<draft, rejection, opposition>(
            optgen: Optimization.Generator<draft, rejection, opposition>,
        ): AsyncGenerator<Draft<draft> | Opposition<opposition>, never, Rejection<rejection> | void> {
            try {
                let output = await optgen.next().then(r => r.value);
                if (output instanceof Draft) {} else throw new Error();
                let draft = output;
                for (;;) {
                    const input: Rejection<rejection> | void = yield output;
                    if (input instanceof Rejection) {
                        output = await optgen.next(input).then(r => r.value);
                        if (output instanceof Draft) draft = output;
                    } else
                        output = draft;
                }
            } finally {
                await optgen[Symbol.asyncDispose]?.();
            }
        }
    }


    export interface View<in out draft, in out rejection, in out opposition> {
        repeat(): Promise<Draft<draft>>;
        reject(rejection: Rejection<rejection>): Promise<Draft<draft> | Opposition<opposition>>;
    }
    export namespace View {

        export function map<draft, nextdraft, rejection, opposition>(
            optview: Optimization.View<draft, rejection, opposition>,
            f: (draft: draft) => Promise<nextdraft>,
        ): Optimization.View<nextdraft, rejection, opposition> {

            async function* nextoptgen(): Optimization.Generator<nextdraft, rejection, opposition> {
                let nextoutput: Draft<nextdraft> | Opposition<opposition> = Draft.from(
                    await f(await optview.repeat().then(r => r.extract())),
                );
                for (;;) {
                    const rejection: Rejection<rejection> = yield nextoutput;
                    const output = await optview.reject(rejection);
                    if (output instanceof Draft)
                        nextoutput = Draft.from(await f(output.extract()));
                    else if (output instanceof Opposition)
                        nextoutput = output;
                    else throw new Error();
                }
            }
            return Optimization.from(nextoptgen());
        }
    }

    export interface Snapshot<
        in out draft, in out rejection, in out opposition,
    > extends Optimization.View<draft, rejection, opposition> {
        repeat(): Promise<Draft<draft>>;
        /**
         * @throws {@link Rejection}
         */
        reject(rejection: Rejection<rejection>): Promise<Opposition<opposition>>;
    }

    export namespace Snapshot {

        export function map<draft, nextdraft, rejection, opposition>(
            opt: Optimization.Snapshot<draft, rejection, opposition> | Optimization.View<draft, rejection, opposition>,
            f: (draft: draft) => Promise<nextdraft>,
        ): Optimization.Snapshot<nextdraft, rejection, opposition> {

            async function* nextoptgen(): Optimization.Generator<nextdraft, rejection, opposition> {
                let nextoutput: Draft<nextdraft> | Opposition<opposition> = Draft.from(
                    await f(await opt.repeat().then(r => r.extract())),
                );
                for (;;) {
                    const rejection: Rejection<rejection> = yield nextoutput;
                    const output = await opt.reject(rejection);
                    if (output instanceof Draft)
                        throw rejection;
                    else if (output instanceof Opposition)
                        nextoutput = output;
                    else throw new Error();
                }
            }
            return Optimization.from(nextoptgen()) as Optimization.Snapshot<nextdraft, rejection, opposition>;
        }
    }
}
