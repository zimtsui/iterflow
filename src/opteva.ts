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
    for (let rejection = await eva.submit(draft); rejection instanceof Rejection;) {
        const optoutput = await opt.reject(rejection);
        if (optoutput instanceof Opposition) {
            rejection = await eva.oppose(optoutput);
        } else if (optoutput instanceof Draft) {
            throw rejection;
        }
    }
}
