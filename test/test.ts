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

    async function* evaluate(): Evaluation.Generator<string, string, string, string> {
        const draft = yield;
        events.push(['evaluation.submit', draft.extract()]);
        let nextInput = yield new Rejection('needs-revision');
        for (;;) {
            if (nextInput instanceof Draft || nextInput instanceof Opposition) {} else throw new Error();
            nextInput = yield new Draft(`accepted:${draft.extract()}`);
        }
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


test('opteva returns a snapshot after evaluator acceptance and snapshot reject rethrows revisions', async t => {
    const events: Array<[string, string]> = [];

    async function* optimize(): Optimization.Generator<string, string, string> {
        const firstRejection = yield new Draft('draft-1');
        events.push(['optimizer.reject', firstRejection.extract()]);
        let nextRejection = yield new Opposition('draft-1-is-correct');
        events.push(['optimizer.reject', nextRejection.extract()]);
        for (;;)
            nextRejection = yield new Draft(`draft-2:${nextRejection.extract()}`);
    }

    async function* evaluate(): Evaluation.Generator<string, number, string, string> {
        const draft = yield;
        events.push(['evaluation.submit', draft.extract()]);
        const opposition = yield new Rejection('prove-it');
        events.push(['evaluation.oppose', opposition.extract()]);
        let nextInput = yield new Draft(42);
        for (;;) {
            if (nextInput instanceof Draft || nextInput instanceof Opposition) {} else throw new Error();
            nextInput = yield new Draft(42);
        }
    }

    const optimization = Optimization.from(optimize());
    const evaluation = await Evaluation.from(evaluate());

    try {
        const snapshot = await opteva(optimization, evaluation);

        t.is((await snapshot.repeat()).extract(), 42);
        await t.throwsAsync(snapshot.reject(new Rejection('needs-restart')), {
            instanceOf: Rejection,
        });
        t.deepEqual(events, [
            ['evaluation.submit', 'draft-1'],
            ['optimizer.reject', 'prove-it'],
            ['evaluation.oppose', 'draft-1-is-correct'],
            ['optimizer.reject', 'needs-restart'],
        ]);
    } finally {
        await dispose(evaluation, optimization);
    }
});


test('Optimization.View.map keeps the last mapped draft across opposition', async t => {
    const mappedInputs: number[] = [];

    async function* optimize(): Optimization.Generator<number, string, string> {
        const firstRejection = yield new Draft(1);
        const secondRejection = yield new Opposition(`oppose:${firstRejection.extract()}`);
        let nextRejection = yield new Draft(secondRejection.extract().length);
        for (;;)
            nextRejection = yield new Draft(nextRejection.extract().length);
    }

    const source = Optimization.from(optimize());
    const mapped = Optimization.View.map(source, async draft => {
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
        await dispose(source);
    }
});


test('Optimization.Snapshot.map forwards opposition and rethrows restarts', async t => {
    async function* optimize(): Optimization.Generator<string, string, string> {
        const firstRejection = yield new Draft('draft-1');
        let nextRejection = yield new Opposition(`oppose:${firstRejection.extract()}`);
        for (;;)
            nextRejection = yield new Draft(`draft-2:${nextRejection.extract()}`);
    }

    async function* evaluate(): Evaluation.Generator<string, number, string, string> {
        const draft = yield;
        if (draft instanceof Draft) {} else throw new Error();
        let nextInput = yield new Draft(draft.extract().length);
        for (;;) {
            if (nextInput instanceof Draft || nextInput instanceof Opposition) {} else throw new Error();
            nextInput = yield new Draft(draft.extract().length);
        }
    }

    const optimization = Optimization.from(optimize());
    const evaluation = await Evaluation.from(evaluate());

    try {
        const snapshot = await opteva(optimization, evaluation);
        const mapped = Optimization.Snapshot.map(snapshot, async n => `len:${n}`);

        t.is((await mapped.repeat()).extract(), 'len:7');
        const opposition = await mapped.reject(new Rejection('restart'));
        t.true(opposition instanceof Opposition);
        t.is(opposition.extract(), 'oppose:restart');
    } finally {
        await dispose(evaluation, optimization);
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
    async function* evaluate(): Evaluation.Generator<string, string, string, string> {
        yield new Rejection('not-void');
        throw new Error('unreachable');
    }

    await t.throwsAsync(Evaluation.from(evaluate()), { instanceOf: Error });
});


test('Evaluation.from rejects evaluators that yield a draft before first input', async t => {
    async function* evaluate(): Evaluation.Generator<string, string, string, string> {
        yield new Draft('too-early');
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

    async function* evaluateNumber(): Evaluation.Generator<number, number, string, string> {
        let input = yield;
        for (;;) {
            if (input instanceof Draft) {} else throw new Error();
            events.push(`number.submit:${input.extract()}`);
            input = yield new Draft(input.extract());
        }
    }

    async function* evaluateBoolean(): Evaluation.Generator<number, boolean, string, string> {
        let input = yield;
        if (input instanceof Draft) {} else throw new Error();
        events.push(`boolean.submit:${input.extract()}`);
        input = yield new Rejection('boolean-reject');
        for (;;) {
            if (input instanceof Draft) {} else throw new Error();
            events.push(`boolean.submit:${input.extract()}`);
            input = yield new Draft(input.extract() % 2 === 0);
        }
    }

    const optimization = Optimization.from(optimize());
    const numberEvaluation = await Evaluation.from(evaluateNumber());
    const booleanEvaluation = await Evaluation.from(evaluateBoolean());

    try {
        let finalDraft: Draft<boolean> | undefined;

        for (;;) {
            try {
                const numberShot = await opteva(optimization, numberEvaluation);
                const booleanShot = await opteva(numberShot, booleanEvaluation);
                finalDraft = await booleanShot.repeat();
                break;
            } catch (e) {
                if (e instanceof Rejection) {} else throw e;
            }
        }

        t.is(finalDraft?.extract(), true);
        t.deepEqual(events, [
            'number.submit:1',
            'boolean.submit:1',
            'optimizer.reject:boolean-reject',
            'number.submit:2',
            'boolean.submit:2',
        ]);
    } finally {
        await dispose(booleanEvaluation, numberEvaluation, optimization);
    }
});
