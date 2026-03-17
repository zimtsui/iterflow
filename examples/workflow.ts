import { Optimization, Evaluation, opteva, Rejection } from '@zimtsui/iterflow';
import { optimize } from './optimize.ts';
import { evaluate } from './evaluate.ts';
const evaluate1: (problem: string) => Evaluation.Raw<string, string> = evaluate;
declare const evaluate2: (problem: string) => Evaluation.Raw<string, number>;
declare const evaluate3: (problem: string) => Evaluation.Raw<number, number>;

export async function workflow(problem: string): Promise<number> {
    await using optimization = Optimization.Cache.from(optimize(problem));
    await using evaluation1 = await Evaluation.Initialized.from(evaluate1(problem));
    await using evaluation2 = await Evaluation.Initialized.from(evaluate2(problem));
    await using evaluation3 = await Evaluation.Initialized.from(evaluate3(problem));
    for (;;) try {
        let snapshotString = Optimization.Snapshot.from(optimization);
        snapshotString = await opteva(snapshotString, evaluation1);
        let snapshotNumber = await opteva(snapshotString, evaluation2);
        snapshotNumber = await opteva(snapshotNumber, evaluation3);
        return await snapshotNumber.next().then(r => r.value);
    } catch (e) {
        if (e instanceof Rejection) {} else throw e;
    }
};
