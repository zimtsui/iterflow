import { Optimization, Evaluation, opteva, Rejection } from '@zimtsui/iterflow';
import { optimize } from './optimize.ts';
import { evaluate } from './evaluate.ts';
const evaluate1: (problem: string) => Evaluation<string, string> = evaluate;
declare const evaluate2: (problem: string) => Evaluation<string, number>;
declare const evaluate3: (problem: string) => Evaluation<number, number>;

export async function workflow(problem: string): Promise<number> {
    await using optimization = Optimization.Cache.from(optimize(problem));
    await using snapshot0 = Optimization.Snapshot.from(optimization);
    await using evaluation1 = await Evaluation.Initialized.from(evaluate1(problem));
    await using evaluation2 = await Evaluation.Initialized.from(evaluate2(problem));
    await using evaluation3 = await Evaluation.Initialized.from(evaluate3(problem));
    for (;;) try {
        await using snapshot1 = await opteva(snapshot0, evaluation1);
        await using snapshot2 = await opteva(snapshot1, evaluation2);
        await using snapshot3 = await opteva(snapshot2, evaluation3);
        return await snapshot3.next().then(r => r.value);
    } catch (e) {
        if (e instanceof Rejection) {} else throw e;
    }
};
