import { Rejection, Opposition, Draft } from './types.ts';



export interface Evaluation<in out draft, in out nextdraft, in out rejection, in out opposition> extends AsyncDisposable {
    submit(draft: Draft<draft>): Promise<Rejection<rejection> | Draft<nextdraft>>;
    oppose(opposition: Opposition<opposition>): Promise<Rejection<rejection> | Draft<nextdraft>>;
}


export namespace Evaluation {

    /**
     * @param evagen Ownership transferred.
     */
    export async function from<draft, nextdraft, rejection, opposition>(
        evagen: Evaluation.Generator<draft, nextdraft, rejection, opposition>,
    ): Promise<Evaluation<draft, nextdraft, rejection, opposition>> {
        const first = await evagen.next().then(r => r.value);
        if (first instanceof Rejection) throw new Error();
        if (first instanceof Draft) throw new Error();
        return {
            async submit(draft: Draft<draft>): Promise<Rejection<rejection> | Draft<nextdraft>> {
                const output = await evagen.next(draft).then(r => r.value);
                if (output instanceof Rejection || output instanceof Draft) return output;
                else throw new Error();
            },

            async oppose(opposition: Opposition<opposition>): Promise<Rejection<rejection> | Draft<nextdraft>> {
                const output = await evagen.next(opposition).then(r => r.value);
                if (output instanceof Rejection || output instanceof Draft) return output;
                else throw new Error();
            },

            async [Symbol.asyncDispose](): Promise<void> {
                await evagen[Symbol.asyncDispose]?.();
            }
        } satisfies Evaluation<draft, nextdraft, rejection, opposition>;
    }

    /**
     * First yield must be void.
     */
    export type Generator<
        draft, nextdraft, rejection, opposition,
    > = AsyncGenerator<Rejection<rejection> | Draft<nextdraft> | void, never, Draft<draft> | Opposition<opposition>>;

}
