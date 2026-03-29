import { Rejection, Opposition, Draft } from './types.ts';



export interface Evaluation<in out draft, in out rejection, in out opposition> extends AsyncDisposable {
    submit(draft: Draft<draft>): Promise<Rejection<rejection> | void>;
    oppose(opposition: Opposition<opposition>): Promise<Rejection<rejection> | void>;
}


export namespace Evaluation {

    /**
     * @param evagen Ownership transferred.
     */
    export async function from<draft, rejection, opposition>(
        evagen: Evaluation.Generator<draft, rejection, opposition>,
    ): Promise<Evaluation<draft, rejection, opposition>> {
        await evagen.next();
        return {
            async submit(draft: Draft<draft>): Promise<Rejection<rejection> | void> {
                return await evagen.next(draft).then(r => r.value);
            },

            async oppose(opposition: Opposition<opposition>): Promise<Rejection<rejection> | void> {
                return await evagen.next(opposition).then(r => r.value);
            },

            async [Symbol.asyncDispose](): Promise<void> {
                await evagen[Symbol.asyncDispose]?.();
            }
        } satisfies Evaluation<draft, rejection, opposition>;
    }

    export type Generator<
        draft, rejection, opposition,
    > = AsyncGenerator<Rejection<rejection> | void, never, Draft<draft> | Opposition<opposition>>;

}
