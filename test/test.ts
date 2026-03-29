import test from 'ava';
import {
    Draft,
    Evaluation,
    opteva,
    Opposition,
    Optimization,
    Rejection,
} from '../build/exports.js';


async function dispose(...values: AsyncDisposable[]): Promise<void> {
    for (const value of values.reverse())
        await value[Symbol.asyncDispose]();
}


test('opteva throws rejection after optimizer produces a new draft', async t => {
    const events: Array<[string, string]> = [];

    async function* optimize(): Optimization.Generator<string, string, string> {
        const rejection = yield new Draft('draft-1');
        events.push(['optimizer.reject', rejection.extract()]);
        let nextRejection = yield new Draft('draft-2');
        for (;;)
            nextRejection = yield new Draft(`draft-2:${nextRejection.extract()}`);
    }

    async function* evaluate(): Evaluation.Generator<string, string, string> {
        const draft = yield;
        events.push(['evaluation.submit', draft.extract()]);
        let nextInput = yield new Rejection('needs-revision');
        for (;;)
            nextInput = yield;
    }

    const optimization = Optimization.from(optimize());
    const evaluation = await Evaluation.from(evaluate());

    try {
        const thrown = await t.throwsAsync(opteva(optimization, evaluation), {
            instanceOf: Rejection,
        });

        t.is(thrown?.extract(), 'needs-revision');
        t.is((await optimization.repeat()).extract(), 'draft-2');
        t.deepEqual(events, [
            ['evaluation.submit', 'draft-1'],
            ['optimizer.reject', 'needs-revision'],
        ]);
    } finally {
        await dispose(evaluation, optimization);
    }
});


test('opteva continues when optimizer opposes a rejection and evaluator accepts', async t => {
    const events: Array<[string, string]> = [];

    async function* optimize(): Optimization.Generator<string, string, string> {
        const rejection = yield new Draft('draft-1');
        events.push(['optimizer.reject', rejection.extract()]);
        let nextRejection = yield new Opposition('draft-1-is-correct');
        for (;;)
            nextRejection = yield new Draft(`draft-1:${nextRejection.extract()}`);
    }

    async function* evaluate(): Evaluation.Generator<string, string, string> {
        const draft = yield;
        events.push(['evaluation.submit', draft.extract()]);
        const opposition = yield new Rejection('prove-it');
        events.push(['evaluation.oppose', opposition.extract()]);
        let nextInput = yield;
        for (;;)
            nextInput = yield;
    }

    const optimization = Optimization.from(optimize());
    const evaluation = await Evaluation.from(evaluate());

    try {
        await opteva(optimization, evaluation);

        t.is((await optimization.repeat()).extract(), 'draft-1');
        t.deepEqual(events, [
            ['evaluation.submit', 'draft-1'],
            ['optimizer.reject', 'prove-it'],
            ['evaluation.oppose', 'draft-1-is-correct'],
        ]);
    } finally {
        await dispose(evaluation, optimization);
    }
});


test('Optimization.map keeps the last mapped draft across opposition', async t => {
    const mappedInputs: number[] = [];

    async function* optimize(): Optimization.Generator<number, string, string> {
        const firstRejection = yield new Draft(1);
        const secondRejection = yield new Opposition(`oppose:${firstRejection.extract()}`);
        let nextRejection = yield new Draft(secondRejection.extract().length);
        for (;;)
            nextRejection = yield new Draft(nextRejection.extract().length);
    }

    const source = Optimization.from(optimize());
    const mapped = Optimization.map(source, async draft => {
        mappedInputs.push(draft);
        return `mapped:${draft}`;
    });

    try {
        t.is((await mapped.repeat()).extract(), 'mapped:1');

        const opposition = await mapped.reject(new Rejection('bad'));
        t.true(opposition instanceof Opposition);
        t.is(opposition.extract(), 'oppose:bad');

        t.is((await mapped.repeat()).extract(), 'mapped:1');
        t.deepEqual(mappedInputs, [1]);

        const draft = await mapped.reject(new Rejection('worse'));
        t.true(draft instanceof Draft);
        t.is(draft.extract(), 'mapped:5');
        t.deepEqual(mappedInputs, [1, 5]);
    } finally {
        await dispose(mapped, source);
    }
});


test('Optimization.from requires the first yield to be a draft', async t => {
    async function* optimize(): Optimization.Generator<string, string, string> {
        yield new Opposition('not-a-draft');
        throw new Error('unreachable');
    }

    const optimization = Optimization.from(optimize());

    try {
        await t.throwsAsync(optimization.repeat(), { instanceOf: Error });
    } finally {
        await dispose(optimization);
    }
});


test('Evaluation.from requires the first yield to be void', async t => {
    async function* evaluate(): Evaluation.Generator<string, string, string> {
        yield new Rejection('not-void');
        throw new Error('unreachable');
    }

    await t.throwsAsync(Evaluation.from(evaluate()), { instanceOf: Error });
});


test('multiple evaluators restart from the first evaluator after a later rejection', async t => {
    const events: string[] = [];

    async function* optimize(): Optimization.Generator<number, string, string> {
        let rejection = yield new Draft(1);
        let draft = 2;
        for (;;) {
            events.push(`optimizer.reject:${rejection.extract()}`);
            rejection = yield new Draft(draft++);
        }
    }

    async function* evaluateNumber(): Evaluation.Generator<number, string, string> {
        let input = yield;
        for (;;) {
            if (input instanceof Draft) {} else throw new Error();
            events.push(`number.submit:${input.extract()}`);
            input = yield;
        }
    }

    async function* evaluateString(): Evaluation.Generator<string, string, string> {
        let input = yield;
        if (input instanceof Draft) {} else throw new Error();
        events.push(`string.submit:${input.extract()}`);
        input = yield new Rejection('string-reject');
        for (;;) {
            if (input instanceof Draft) {} else throw new Error();
            events.push(`string.submit:${input.extract()}`);
            input = yield;
        }
    }

    const optimization = Optimization.from(optimize());
    const numberEvaluation = await Evaluation.from(evaluateNumber());
    const stringEvaluation = await Evaluation.from(evaluateString());

    try {
        let finalDraft: Draft<string> | undefined;

        for (;;) {
            let stringView: Optimization<string, string, string> | undefined;
            try {
                const numberView = optimization;
                await opteva(numberView, numberEvaluation);
                stringView = Optimization.map(numberView, async draft => {
                    events.push(`map:${draft}`);
                    return `value:${draft}`;
                });
                await opteva(stringView, stringEvaluation);
                finalDraft = await stringView.repeat();
                break;
            } catch (e) {
                if (e instanceof Rejection) {} else throw e;
            } finally {
                if (stringView)
                    await stringView[Symbol.asyncDispose]();
            }
        }

        t.is(finalDraft?.extract(), 'value:2');
        t.deepEqual(events, [
            'number.submit:1',
            'map:1',
            'string.submit:value:1',
            'optimizer.reject:string-reject',
            'map:2',
            'number.submit:2',
            'map:2',
            'string.submit:value:2',
        ]);
    } finally {
        await dispose(stringEvaluation, numberEvaluation, optimization);
    }
});
