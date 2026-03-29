import { Optimization, Evaluation, opteva, Rejection } from '@zimtsui/iterflow';
declare function optimize(problem: string): Optimization.Generator<number, string, string>;
declare function evaluateNumber(problem: string): Evaluation.Generator<number, string, string>;
declare function stringifySolution(solution: number): Promise<string>;
declare function evaluateString(problem: string): Evaluation.Generator<string, string, string>;

export async function workflow(problem: string): Promise<string> {
    await using optimization = Optimization.from(optimize(problem));
    await using numberEvaluation = await Evaluation.from(evaluateNumber(problem));
    await using stringEvaluation = await Evaluation.from(evaluateString(problem));
    for (;;) try {
        const numberView = optimization;
        await opteva(numberView, numberEvaluation);
        const stringView = Optimization.map(numberView, stringifySolution);
        await opteva(stringView, stringEvaluation);
        const finalDraft = await stringView.repeat();
        return finalDraft.extract();
    } catch (e) {
        if (e instanceof Rejection) {} else throw e;
    }
};
