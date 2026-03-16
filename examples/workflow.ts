import { Optimization, Evaluation, opteva } from '@zimtsui/iterflow';
import { optimize } from './optimize.ts';
import { evaluate } from './evaluate.ts';
declare const evaluate1: typeof evaluate;
declare const evaluate2: typeof evaluate;
declare const evaluate3: typeof evaluate;

export async function workflow(problem: string): Promise<string> {
    await using optimization = Optimization.init(optimize(problem));
    await using evaluation1 = await Evaluation.init(evaluate1(problem));
    await using evaluation2 = await Evaluation.init(evaluate2(problem));
    await using evaluation3 = await Evaluation.init(evaluate3(problem));
    for (let accepted = false; !accepted;) try {
        await opteva(optimization, evaluation1);
        await opteva(optimization, evaluation2);
        await opteva(optimization, evaluation3);
        accepted = true;
    } catch (e) {
        accepted = false;
    }
    return await optimization.next().then(r => r.value);
};
