import { Draft, Critique, Rebuttal } from './types.ts';
import { Optimization } from './optimization.ts';
import { Evaluation } from './evaluation.ts';




/**
 * @throws {@link Critique}
 */
export async function opteva<draft, nextdraft, critique, rebuttal>(
    opt: Optimization.View<draft, critique, rebuttal> | Optimization.Snapshot<draft, critique, rebuttal>,
    eva: Evaluation<draft, nextdraft, critique, rebuttal>,
): Promise<Optimization.Snapshot<nextdraft, critique, rebuttal>> {
    let draft = await opt.repeat();
    let evaoutput = await eva.submit(draft)
    for (; evaoutput instanceof Critique;) {
        const critique = evaoutput;
        const optoutput = await opt.reject(critique);
        if (optoutput instanceof Rebuttal) {
            evaoutput = await eva.challenge(optoutput);
        } else if (optoutput instanceof Draft) {
            throw critique;
        }
    }

    let nextoutput: Draft<nextdraft> | Rebuttal<rebuttal> = evaoutput;
    async function *nextgen(): Optimization.Generator<nextdraft, critique, rebuttal> {
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
    return Optimization.from(nextgen()) as Optimization.Snapshot<nextdraft, critique, rebuttal>;
}
