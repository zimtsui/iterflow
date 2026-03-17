import test from 'ava';
import {
    Evaluation,
    Optimization,
    Opposition,
    Rejection,
    opteva,
} from './exports.ts';

test('Evaluation.Initialized.from rejects evaluators that miss the sentinel first yield', async t => {
    async function *raw(): Evaluation.Raw<string> {
        yield 'not-a-sentinel';
        throw new Error('unreachable');
    }

    const error = await t.throwsAsync(async () => {
        await Evaluation.Initialized.from(raw());
    });

    t.true(error instanceof Error);
    if (error instanceof Error) t.is(error.cause, 'not-a-sentinel');
});

test('Optimization.Cache.from replays the latest accepted draft and preserves it after opposition', async t => {
    const seenRejections: string[] = [];

    async function *raw(): Optimization.Raw<string> {
        let draft = 'draft-1';
        for (;;) try {
            yield draft;
        } catch (e) {
            if (!(e instanceof Rejection)) throw e;
            seenRejections.push(e.message);
            if (e.message === 'revise') draft = 'draft-2';
            else if (e.message === 'wrong') yield new Opposition('keep draft-2');
            else throw e;
        }
    }

    await using cache = Optimization.Cache.from(raw());

    t.is(await cache.next().then(r => r.value), 'draft-1');
    t.is(await cache.next().then(r => r.value), 'draft-1');
    t.is(await cache.throw(new Rejection('revise')).then(r => r.value), 'draft-2');
    t.is(await cache.next().then(r => r.value), 'draft-2');

    const opposition = await cache.throw(new Rejection('wrong')).then(r => r.value);
    t.true(opposition instanceof Opposition);
    if (opposition instanceof Opposition) t.is(opposition.message, 'keep draft-2');

    t.is(await cache.next().then(r => r.value), 'draft-2');
    t.deepEqual(seenRejections, ['revise', 'wrong']);
});

test('Optimization.Snapshot.from rethrows revisions and only returns oppositions', async t => {
    async function *raw(): Optimization.Raw<string> {
        let draft = 'draft-1';
        for (;;) try {
            yield draft;
        } catch (e) {
            if (!(e instanceof Rejection)) throw e;
            if (e.message === 'revise') draft = 'draft-2';
            else if (e.message === 'wrong') yield new Opposition('keep draft-2');
            else throw e;
        }
    }

    await using cache = Optimization.Cache.from(raw());
    const snapshot = Optimization.Snapshot.from(cache);

    t.is(await snapshot.next().then(r => r.value), 'draft-1');

    const revision = new Rejection('revise');
    let thrown: unknown;
    try {
        await snapshot.throw(revision);
    } catch (e) {
        thrown = e;
    }
    t.is(thrown, revision);

    t.is(await snapshot.next().then(r => r.value), 'draft-2');

    const opposition = await snapshot.throw(new Rejection('wrong')).then(r => r.value);
    t.true(opposition instanceof Opposition);
    if (opposition instanceof Opposition) t.is(opposition.message, 'keep draft-2');
});

test('opteva returns a recovered snapshot when the evaluator accepts immediately', async t => {
    async function *optimize(): Optimization.Raw<string> {
        yield 'draft';
        throw new Error('unreachable');
    }

    async function *evaluate(): Evaluation.Raw<string, number> {
        const draft = yield new Evaluation.FirstYield();
        yield draft.length;
        throw new Error('unreachable');
    }

    await using optimization = Optimization.Cache.from(optimize());
    await using evaluation = await Evaluation.Initialized.from(evaluate());

    const snapshot = await opteva(Optimization.Snapshot.from(optimization), evaluation);

    t.is(await snapshot.next().then(r => r.value), 5);
    t.is(await snapshot.next().then(r => r.value), 5);
});

test('opteva surfaces a rejection after optimizer revision and succeeds on the next attempt', async t => {
    async function *optimize(): Optimization.Raw<string> {
        let draft = 'draft-1';
        for (;;) try {
            yield draft;
        } catch (e) {
            if (!(e instanceof Rejection)) throw e;
            if (e.message === 'too short') draft = 'draft-2';
            else throw e;
        }
    }

    async function *evaluate(): Evaluation.Raw<string, string> {
        let draft = yield new Evaluation.FirstYield();
        draft = yield new Rejection('too short');
        yield draft.toUpperCase();
        throw new Error('unreachable');
    }

    await using optimization = Optimization.Cache.from(optimize());
    await using evaluation = await Evaluation.Initialized.from(evaluate());

    let rejection: unknown;
    try {
        await opteva(Optimization.Snapshot.from(optimization), evaluation);
    } catch (e) {
        rejection = e;
    }

    t.true(rejection instanceof Rejection);
    if (rejection instanceof Rejection) t.is(rejection.message, 'too short');

    const snapshot = await opteva(Optimization.Snapshot.from(optimization), evaluation);
    t.is(await snapshot.next().then(r => r.value), 'DRAFT-2');
});

test('opteva resolves optimizer opposition through evaluator.throw without restarting', async t => {
    async function *optimize(): Optimization.Raw<string> {
        for (;;) try {
            yield 'candidate';
        } catch (e) {
            if (!(e instanceof Rejection)) throw e;
            if (e.message === 'wrong') yield new Opposition('candidate is valid');
            else throw e;
        }
    }

    async function *evaluate(): Evaluation.Raw<string, string> {
        const draft = yield new Evaluation.FirstYield();
        try {
            yield new Rejection('wrong');
        } catch (e) {
            if (!(e instanceof Opposition)) throw e;
            yield `${draft}:${e.message}`;
            throw new Error('unreachable');
        }
        throw new Error('unreachable');
    }

    await using optimization = Optimization.Cache.from(optimize());
    await using evaluation = await Evaluation.Initialized.from(evaluate());

    const snapshot = await opteva(Optimization.Snapshot.from(optimization), evaluation);

    t.is(await snapshot.next().then(r => r.value), 'candidate:candidate is valid');
});
