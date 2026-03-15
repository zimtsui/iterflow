export class Opposition {
    public constructor(public message: string) {}
}
export class Rejection {
    public constructor(public message: string) {}
}


/**
 * @throws outgoing {@link Opposition}
 * @throws incoming {@link Rejection}
 */
export interface Optimizing extends AsyncGenerator<string, never, void> {}

/**
 * @throws outgoing {@link Rejection}
 * @throws incoming {@link Opposition}
 */
export interface Evaluating extends AsyncGenerator<void, never, string> {}


/**
 * @throws {@link Rejection}
 */
export async function opteva(opt: Optimizing, eva: Evaluating): Promise<void> {
    const draft = await opt.next().then(r => r.value);;
    try {
        return await eva.next(draft).then(r => r.value);
    } catch (e) {
        if (e instanceof Rejection) {} else throw e;
        for (let rejection = e;;) try {
            await opt.throw(rejection);
            throw rejection;
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
