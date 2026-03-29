import { Draft, Rejection, Opposition } from './types.ts';
import { Optimization } from './optimization.ts';
import { Evaluation } from './evaluation.ts';




/**
 * @throws {@link Rejection}
 */
export async function opteva<draft, rejection, opposition>(
    opt: Optimization<draft, rejection, opposition>,
    eva: Evaluation<draft, rejection, opposition>,
): Promise<void> {
    let draft = await opt.repeat();
    for (let evaoutput = await eva.submit(draft); evaoutput instanceof Rejection;) {
        const rejection = evaoutput;
        const optoutput = await opt.reject(rejection);
        if (optoutput instanceof Opposition) {
            evaoutput = await eva.oppose(optoutput);
        } else if (optoutput instanceof Draft) {
            throw rejection;
        }
    }
}
