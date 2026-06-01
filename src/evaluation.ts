import { Critique, Rebuttal, Draft } from './types.ts';



export interface Evaluation<in out draft, in out nextdraft, in out critique, in out rebuttal> extends AsyncDisposable {
    submit(draft: Draft<draft>): Promise<Critique<critique> | Draft<nextdraft>>;
    challenge(rebuttal: Rebuttal<rebuttal>): Promise<Critique<critique> | Draft<nextdraft>>;
}


export namespace Evaluation {

    /**
     * @param evagen Ownership transferred.
     */
    export async function from<draft, nextdraft, critique, rebuttal>(
        evagen: Evaluation.Generator<draft, nextdraft, critique, rebuttal>,
    ): Promise<Evaluation<draft, nextdraft, critique, rebuttal>> {
        const first = await evagen.next().then(r => r.value);
        if (first instanceof Critique) throw new Error();
        if (first instanceof Draft) throw new Error();
        return {
            async submit(draft: Draft<draft>): Promise<Critique<critique> | Draft<nextdraft>> {
                const output = await evagen.next(draft).then(r => r.value);
                if (output instanceof Critique || output instanceof Draft) return output;
                else throw new Error();
            },

            async challenge(rebuttal: Rebuttal<rebuttal>): Promise<Critique<critique> | Draft<nextdraft>> {
                const output = await evagen.next(rebuttal).then(r => r.value);
                if (output instanceof Critique || output instanceof Draft) return output;
                else throw new Error();
            },

            async [Symbol.asyncDispose](): Promise<void> {
                await evagen[Symbol.asyncDispose]?.();
            }
        } satisfies Evaluation<draft, nextdraft, critique, rebuttal>;
    }

    /**
     * First yield must be void.
     */
    export type Generator<
        draft, nextdraft, critique, rebuttal,
    > = AsyncGenerator<Critique<critique> | Draft<nextdraft> | void, never, Draft<draft> | Rebuttal<rebuttal>>;

}
