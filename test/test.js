import test from 'ava';
import {
    Critique,
    Draft,
    Evaluation,
    opteva,
    Optimization,
    Rebuttal,
} from '../build/exports.js';


async function dispose(...values) {
    for (const value of values.reverse())
        await value[Symbol.asyncDispose]();
}


test('opteva throws critique after optimizer produces a new draft', async t => {
    const events = [];

    async function* optimize() {
        const critique = yield Draft.from('draft-1');
        events.push(['optimizer.reject', critique.extract()]);
        let nextCritique = yield Draft.from('draft-2');
        for (;;)
            nextCritique = yield Draft.from(`draft-2:${nextCritique.extract()}`);
    }

    async function* evaluate() {
        const draft = yield;
        events.push(['evaluation.submit', draft.extract()]);
        let nextInput = yield Critique.from('needs-revision');
        for (;;) {
            if (nextInput instanceof Draft || nextInput instanceof Rebuttal) {} else throw new Error();
            nextInput = yield Draft.from(`accepted:${draft.extract()}`);
        }
    }

    const optimization = Optimization.from(optimize());
    const evaluation = await Evaluation.from(evaluate());

    try {
        const thrown = await t.throwsAsync(opteva(optimization, evaluation), {
            instanceOf: Critique,
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


test('opteva returns a snapshot after evaluator acceptance and snapshot reject rethrows critiques', async t => {
    const events = [];

    async function* optimize() {
        const firstCritique = yield Draft.from('draft-1');
        events.push(['optimizer.reject', firstCritique.extract()]);
        let nextCritique = yield Rebuttal.from('draft-1-is-correct');
        events.push(['optimizer.reject', nextCritique.extract()]);
        for (;;)
            nextCritique = yield Draft.from(`draft-2:${nextCritique.extract()}`);
    }

    async function* evaluate() {
        const draft = yield;
        events.push(['evaluation.submit', draft.extract()]);
        const rebuttal = yield Critique.from('prove-it');
        events.push(['evaluation.challenge', rebuttal.extract()]);
        let nextInput = yield Draft.from(42);
        for (;;) {
            if (nextInput instanceof Draft || nextInput instanceof Rebuttal) {} else throw new Error();
            nextInput = yield Draft.from(42);
        }
    }

    const optimization = Optimization.from(optimize());
    const evaluation = await Evaluation.from(evaluate());

    try {
        const snapshot = await opteva(optimization, evaluation);

        t.is((await snapshot.repeat()).extract(), 42);
        await t.throwsAsync(snapshot.reject(Critique.from('needs-restart')), {
            instanceOf: Critique,
        });
        t.deepEqual(events, [
            ['evaluation.submit', 'draft-1'],
            ['optimizer.reject', 'prove-it'],
            ['evaluation.challenge', 'draft-1-is-correct'],
            ['optimizer.reject', 'needs-restart'],
        ]);
    } finally {
        await dispose(evaluation, optimization);
    }
});


test('Optimization.View.map keeps the last mapped draft across rebuttal', async t => {
    const mappedInputs = [];

    async function* optimize() {
        const firstCritique = yield Draft.from(1);
        const secondCritique = yield Rebuttal.from(`rebut:${firstCritique.extract()}`);
        let nextCritique = yield Draft.from(secondCritique.extract().length);
        for (;;)
            nextCritique = yield Draft.from(nextCritique.extract().length);
    }

    const source = Optimization.from(optimize());
    const mapped = Optimization.View.map(source, async draft => {
        mappedInputs.push(draft);
        return `mapped:${draft}`;
    });

    try {
        t.is((await mapped.repeat()).extract(), 'mapped:1');

        const rebuttal = await mapped.reject(Critique.from('bad'));
        t.true(rebuttal instanceof Rebuttal);
        t.is(rebuttal.extract(), 'rebut:bad');

        t.is((await mapped.repeat()).extract(), 'mapped:1');
        t.deepEqual(mappedInputs, [1]);

        const draft = await mapped.reject(Critique.from('worse'));
        t.true(draft instanceof Draft);
        t.is(draft.extract(), 'mapped:5');
        t.deepEqual(mappedInputs, [1, 5]);
    } finally {
        await dispose(source);
    }
});


test('Optimization.Snapshot.map forwards rebuttal and rethrows critiques', async t => {
    async function* optimize() {
        const firstCritique = yield Draft.from('draft-1');
        let nextCritique = yield Rebuttal.from(`rebut:${firstCritique.extract()}`);
        for (;;)
            nextCritique = yield Draft.from(`draft-2:${nextCritique.extract()}`);
    }

    async function* evaluate() {
        const draft = yield;
        if (draft instanceof Draft) {} else throw new Error();
        let nextInput = yield Draft.from(draft.extract().length);
        for (;;) {
            if (nextInput instanceof Draft || nextInput instanceof Rebuttal) {} else throw new Error();
            nextInput = yield Draft.from(draft.extract().length);
        }
    }

    const optimization = Optimization.from(optimize());
    const evaluation = await Evaluation.from(evaluate());

    try {
        const snapshot = await opteva(optimization, evaluation);
        const mapped = Optimization.Snapshot.map(snapshot, async n => `len:${n}`);

        t.is((await mapped.repeat()).extract(), 'len:7');
        const rebuttal = await mapped.reject(Critique.from('restart'));
        t.true(rebuttal instanceof Rebuttal);
        t.is(rebuttal.extract(), 'rebut:restart');
    } finally {
        await dispose(evaluation, optimization);
    }
});


test('Optimization.from requires the first yield to be a draft', async t => {
    async function* optimize() {
        yield Rebuttal.from('not-a-draft');
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
    async function* evaluate() {
        yield Critique.from('not-void');
        throw new Error('unreachable');
    }

    await t.throwsAsync(Evaluation.from(evaluate()), { instanceOf: Error });
});


test('Evaluation.from rejects evaluators that yield a draft before first input', async t => {
    async function* evaluate() {
        yield Draft.from('too-early');
        throw new Error('unreachable');
    }

    await t.throwsAsync(Evaluation.from(evaluate()), { instanceOf: Error });
});


test('multiple evaluators restart from the first evaluator after a later critique', async t => {
    const events = [];

    async function* optimize() {
        let critique = yield Draft.from(1);
        let draft = 2;
        for (;;) {
            events.push(`optimizer.reject:${critique.extract()}`);
            critique = yield Draft.from(draft++);
        }
    }

    async function* evaluateNumber() {
        let input = yield;
        for (;;) {
            if (input instanceof Draft) {} else throw new Error();
            events.push(`number.submit:${input.extract()}`);
            input = yield Draft.from(input.extract());
        }
    }

    async function* evaluateBoolean() {
        let input = yield;
        if (input instanceof Draft) {} else throw new Error();
        events.push(`boolean.submit:${input.extract()}`);
        input = yield Critique.from('boolean-critique');
        for (;;) {
            if (input instanceof Draft) {} else throw new Error();
            events.push(`boolean.submit:${input.extract()}`);
            input = yield Draft.from(input.extract() % 2 === 0);
        }
    }

    const optimization = Optimization.from(optimize());
    const numberEvaluation = await Evaluation.from(evaluateNumber());
    const booleanEvaluation = await Evaluation.from(evaluateBoolean());

    try {
        let finalDraft;

        for (;;) {
            try {
                const numberShot = await opteva(optimization, numberEvaluation);
                const booleanShot = await opteva(numberShot, booleanEvaluation);
                finalDraft = await booleanShot.repeat();
                break;
            } catch (e) {
                if (e instanceof Critique) {} else throw e;
            }
        }

        t.is(finalDraft?.extract(), true);
        t.deepEqual(events, [
            'number.submit:1',
            'boolean.submit:1',
            'optimizer.reject:boolean-critique',
            'number.submit:2',
            'boolean.submit:2',
        ]);
    } finally {
        await dispose(booleanEvaluation, numberEvaluation, optimization);
    }
});
