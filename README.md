# Iterflow

[![Npm package version](https://img.shields.io/npm/v/@zimtsui/iterflow?style=flat-square)](https://www.npmjs.com/package/@zimtsui/iterflow)

Iterflow is an AI workflow orchestrator specifically designed for Optimizer-Evaluator design patterns.

## Examples

### Optimizer

```ts
import { Opposition, Optimization, Rejection } from '@zimtsui/iterflow';
import OpenAI from 'openai';
declare const openai: OpenAI;

export async function *optimize(problem: string): Optimization<string> {
    const messages: OpenAI.ChatCompletionMessageParam[] = [
        {
            role: 'system',
            content: [
                'Please solve math problems.',
                'Your answer will be evaluated and the feedback will be provided if the answer is rejected.'
            ].join(' ')
        },
        { role: 'user', content: problem },
    ];
    for (;;) try {
        const completion = await openai.chat.completions.create({ model: 'gpt-4o', messages });
        messages.push(completion.choices[0]!.message);
        if (completion.choices[0]!.message.content! === 'OPPOSE')
            return yield Promise.reject(new Opposition('My answer is correct.'));
        else
            return yield completion.choices[0]!.message.content!;
    } catch (e) {
        if (e instanceof Rejection) {} else throw e;
        messages.push({
            role: 'user',
            content: `Your answer is rejected: ${e.message}. Please revise your answer.`,
        });
    }
}
```

### Evaluator

```ts
import { Evaluation, Rejection, Opposition } from '@zimtsui/iterflow';
import OpenAI from 'openai';
declare const openai: OpenAI;

export async function *evaluate(problem: string): Evaluation<string> {
    const messages: OpenAI.ChatCompletionMessageParam[] = [
        {
            role: 'system',
            content: [
                'Please examine the given answer of the given math problem.',
                'Print only `ACCEPT` if it is correct.',
            ].join(' '),
        },
        { role: 'user', content: `Problem: ${problem}\n\nAnswer: ${yield}` },
    ];
    for (;;) try {
        const completion = await openai.chat.completions.create({ model: 'gpt-4o', messages });
        messages.push(completion.choices[0]!.message);
        if (completion.choices[0]!.message.content === 'ACCEPT') {}
        else throw new Rejection(completion.choices[0]!.message.content!);
        messages.push({
            role: 'user',
            content: `The answer is revised: ${yield}\n\nPlease examine it again.`,
        });
    } catch (e) {
        if (e instanceof Rejection) {} else throw e;
        try {
            const draft = await Promise.reject(e);
            messages.push({
                role: 'user',
                content: `The answer is revised: ${draft}\n\nPlease examine it again.`,
            });
        } catch (e) {
            if (e instanceof Opposition) {} else throw e;
            messages.push({
                role: 'user',
                content: `Your rejection is opposed: ${e.message}\n\nPlease examine it again.`,
            });
        }
    }
}
```

### Workflow

```ts
import { Optimization, Evaluation, opteva } from '@zimtsui/iterflow';
import { optimize } from './optimize.ts';
import { evaluate } from './evaluate.ts';
declare const evaluate1: typeof evaluate;
declare const evaluate2: typeof evaluate;
declare const evaluate3: typeof evaluate;

export async function workflow(problem: string): Promise<string> {
    await using optimization = Optimization.init(optimize(problem));
    await using evaluation1 = await Evaluation.init(evaluate1(problem));
    await using evaluation2 = await Evaluation.init(evaluate2(problem));
    await using evaluation3 = await Evaluation.init(evaluate3(problem));
    for (let accepted = false; !accepted;) try {
        await opteva(optimization, evaluation1);
        await opteva(optimization, evaluation2);
        await opteva(optimization, evaluation3);
        accepted = true;
    } catch (e) {
        accepted = false;
    }
    return await optimization.next().then(r => r.value);
};
```
