import { Optimization, Evaluation, opteva, Rejection } from '@zimtsui/iterflow';
declare function optimize(problem: string): Optimization.Generator<string, string, string>;
declare function evaluate1(problem: string): Evaluation.Generator<string, void, string, string>;
declare function evaluate2(problem: string): Evaluation.Generator<number, boolean, string, string>;


export async function workflow(problem: string): Promise<boolean> {
    await using optimization = Optimization.from(optimize(problem));
    await using evaluation1 = await Evaluation.from(evaluate1(problem));
    await using evaluation2 = await Evaluation.from(evaluate2(problem));
    for (;;) try {
        const stringView = optimization;
        await opteva(stringView, evaluation1);
        const numberView = Optimization.View.map(stringView, async s => Number.parseInt(s));
        const booleanShot = await opteva(numberView, evaluation2);
        const finalDraft = await booleanShot.repeat();
        return finalDraft.extract();
    } catch (e) {
        if (e instanceof Rejection) {} else throw e;
    }
};
