import { Draft, Rejection, Opposition } from './types.ts';
import { Optimization } from './optimization.ts';
import { Evaluation } from './evaluation.ts';




/**
 * @throws {@link Rejection}
 */
export async function opteva<draft, nextdraft, rejection, opposition>(
    opt: Optimization.View<draft, rejection, opposition> | Optimization.Snapshot<draft, rejection, opposition>,
    eva: Evaluation<draft, nextdraft, rejection, opposition>,
): Promise<Optimization.Snapshot<nextdraft, rejection, opposition>> {
    let draft = await opt.repeat();
    let evaoutput = await eva.submit(draft)
    for (; evaoutput instanceof Rejection;) {
        const rejection = evaoutput;
        const optoutput = await opt.reject(rejection);
        if (optoutput instanceof Opposition) {
            evaoutput = await eva.oppose(optoutput);
        } else if (optoutput instanceof Draft) {
            throw rejection;
        }
    }

    let nextoutput: Draft<nextdraft> | Opposition<opposition> = evaoutput;
    async function *nextgen(): Optimization.Generator<nextdraft, rejection, opposition> {
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
    return Optimization.from(nextgen()) as Optimization.Snapshot<nextdraft, rejection, opposition>;
}
