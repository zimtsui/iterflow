

export class Opposition {
    public constructor(public message: string) {}
}
export class Rejection {
    public constructor(public message: string) {}
}


export interface Optimization extends AsyncGenerator<string, never, never> {}
export namespace Optimization {
    /**
     * @throws outgoing {@link Opposition}
     * @throws incoming {@link Rejection}
     */
    export interface Initialized extends AsyncGenerator<string, never, void> {}
    export async function *init(raw0: Optimization): Optimization.Initialized {
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
export interface Evaluation extends AsyncGenerator<void, never, string> {}
export namespace Evaluation {
    export interface Initialized extends AsyncGenerator<void, never, string> {}
    export async function init(raw: Evaluation): Promise<Evaluation.Initialized> {
        await raw.next();
        return raw;
    }
}

/**
 * @throws {@link Rejection}
 */
export async function opteva(opt: Optimization.Initialized, eva: Evaluation.Initialized): Promise<void> {
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
