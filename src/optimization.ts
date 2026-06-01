import { Draft, Critique, Rebuttal } from './types.ts';



export interface Optimization<
    in out draft, in out critique, in out rebuttal,
> extends AsyncDisposable, Optimization.View<draft, critique, rebuttal> {}


export namespace Optimization {

    /**
     * First yield must be a draft.
     */
    export type Generator<
        draft, critique, rebuttal,
    > = AsyncGenerator<Draft<draft> | Rebuttal<rebuttal>, never, Critique<critique>>;


    /**
     * @param optgen Ownership transferred.
     */
    export function from<draft, critique, rebuttal>(
        optgen: Optimization.Generator<draft, critique, rebuttal>,
    ): Optimization<draft, critique, rebuttal> {
        return new Instance(optgen);
    }

    class Instance<in out draft, in out critique, in out rebuttal> implements Optimization<draft, critique, rebuttal> {
        protected it: AsyncGenerator<Draft<draft> | Rebuttal<rebuttal>, never, Critique<critique> | void>;

        /**
        * @param optgen Ownership transferred.
        */
        public constructor(optgen: Optimization.Generator<draft, critique, rebuttal>) {
            this.it = Instance.iterate(optgen);
        }

        public async repeat(): Promise<Draft<draft>> {
            const output = await this.it.next().then(r => r.value);
            if (output instanceof Draft) {} else throw new Error();
            return output;
        }

        public async reject(critique: Critique<critique>): Promise<Draft<draft> | Rebuttal<rebuttal>> {
            return await this.it.next(critique).then(r => r.value);
        }

        public async [Symbol.asyncDispose](): Promise<void> {
            await this.it[Symbol.asyncDispose]?.();
        }

        /**
         * @param optgen Ownership transferred.
         */
        protected static async *iterate<draft, critique, rebuttal>(
            optgen: Optimization.Generator<draft, critique, rebuttal>,
        ): AsyncGenerator<Draft<draft> | Rebuttal<rebuttal>, never, Critique<critique> | void> {
            try {
                let output = await optgen.next().then(r => r.value);
                if (output instanceof Draft) {} else throw new Error();
                let draft = output;
                for (;;) {
                    const input: Critique<critique> | void = yield output;
                    if (input instanceof Critique) {
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


    export interface View<in out draft, in out critique, in out rebuttal> {
        repeat(): Promise<Draft<draft>>;
        reject(critique: Critique<critique>): Promise<Draft<draft> | Rebuttal<rebuttal>>;
    }
    export namespace View {

        export function map<draft, nextdraft, critique, rebuttal>(
            optview: Optimization.View<draft, critique, rebuttal>,
            f: (draft: draft) => Promise<nextdraft>,
        ): Optimization.View<nextdraft, critique, rebuttal> {

            async function* nextoptgen(): Optimization.Generator<nextdraft, critique, rebuttal> {
                let nextoutput: Draft<nextdraft> | Rebuttal<rebuttal> = Draft.from(
                    await f(await optview.repeat().then(r => r.extract())),
                );
                for (;;) {
                    const critique: Critique<critique> = yield nextoutput;
                    const output = await optview.reject(critique);
                    if (output instanceof Draft)
                        nextoutput = Draft.from(await f(output.extract()));
                    else if (output instanceof Rebuttal)
                        nextoutput = output;
                    else throw new Error();
                }
            }
            return Optimization.from(nextoptgen());
        }
    }

    export interface Snapshot<
        in out draft, in out critique, in out rebuttal,
    > extends Optimization.View<draft, critique, rebuttal> {
        repeat(): Promise<Draft<draft>>;
        /**
         * @throws {@link Critique}
         */
        reject(critique: Critique<critique>): Promise<Rebuttal<rebuttal>>;
    }

    export namespace Snapshot {

        export function map<draft, nextdraft, critique, rebuttal>(
            opt: Optimization.Snapshot<draft, critique, rebuttal> | Optimization.View<draft, critique, rebuttal>,
            f: (draft: draft) => Promise<nextdraft>,
        ): Optimization.Snapshot<nextdraft, critique, rebuttal> {

            async function* nextoptgen(): Optimization.Generator<nextdraft, critique, rebuttal> {
                let nextoutput: Draft<nextdraft> | Rebuttal<rebuttal> = Draft.from(
                    await f(await opt.repeat().then(r => r.extract())),
                );
                for (;;) {
                    const critique: Critique<critique> = yield nextoutput;
                    const output = await opt.reject(critique);
                    if (output instanceof Draft)
                        throw critique;
                    else if (output instanceof Rebuttal)
                        nextoutput = output;
                    else throw new Error();
                }
            }
            return Optimization.from(nextoptgen()) as Optimization.Snapshot<nextdraft, critique, rebuttal>;
        }
    }
}
