

export class Opposition {
    public constructor(public message: string) {}
}
export class Rejection {
    public constructor(public message: string) {}
}


export interface Optimization<draft> extends AsyncGenerator<draft, never, never> {}
export namespace Optimization {
    /**
     * @throws outgoing {@link Opposition}
     * @throws incoming {@link Rejection}
     */
    export interface Initialized<draft> extends AsyncGenerator<draft, never, void> {}
    export async function *init<draft>(raw0: Optimization<draft>): Optimization.Initialized<draft> {
        await using raw = raw0;
        let draft = await raw.next().then(r => r.value);
        let output = Promise.resolve(draft);
        for (;;) try {
            yield output;
            output = Promise.resolve(draft);
        } catch (e) {
            if (e instanceof Rejection) {} else throw e;
            try {
                draft = await raw.throw(e).then(r => r.value);
                output = Promise.resolve(draft);
            } catch (e) {
                if (e instanceof Opposition) {} else throw e;
                output = Promise.reject(e);
            }
        }
    }
}



/**
 * @throws {@link Rejection}
 */
export interface Evaluation<draft> extends AsyncGenerator<void, never, draft> {}
export namespace Evaluation {
    export interface Initialized<draft> extends AsyncGenerator<void, never, draft> {}
    export async function init<draft>(raw: Evaluation<draft>): Promise<Evaluation.Initialized<draft>> {
        await raw.next();
        return raw;
    }
}

/**
 * @throws {@link Rejection}
 */
export async function opteva<draft>(opt: Optimization.Initialized<draft>, eva: Evaluation.Initialized<draft>): Promise<void> {
    const draft = await opt.next().then(r => r.value);
    try {
        return await eva.next(draft).then(r => r.value);
    } catch (e) {
        if (e instanceof Rejection) {} else throw e;
        for (let rejection = e;;) try {
            throw await opt.throw(rejection).then(() => e);
        } catch (e) {
            if (e instanceof Opposition) {} else throw e;
            try {
                return await eva.throw(e).then(r => r.value);
            } catch (e) {
                if (e instanceof Rejection) {} else throw e;
                rejection = e;
            }
        }
    }
}
