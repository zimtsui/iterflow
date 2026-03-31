# Iterflow

[![Npm package version](https://img.shields.io/npm/v/@zimtsui/iterflow?style=flat-square)](https://www.npmjs.com/package/@zimtsui/iterflow)

Iterflow is an AI workflow orchestrator specifically designed for Optimizer-Evaluator design patterns.

## Examples

### Optimizer

```ts
import { Optimization, Draft, Opposition } from '@zimtsui/iterflow';
import OpenAI from 'openai';
declare const openai: OpenAI;

export async function *optimize(problem: string): Optimization.Generator<string, string, string> {
    const messages: OpenAI.ChatCompletionMessageParam[] = [
        {
            role: 'system',
            content: [
                'Please solve math problems.',
                'Your answer will be evaluated and the feedback will be provided if the answer is rejected.',
                'Output "OPPOSE" to insist your answer.'
            ].join(' ')
        },
        { role: 'user', content: problem },
    ];
    for (;;) {
        const completion = await openai.chat.completions.create({ model: 'gpt-4o', messages });
        messages.push(completion.choices[0]!.message);
        const rejection = completion.choices[0]!.message.content! === 'OPPOSE'
            ? yield new Opposition('My answer is correct.')
            : yield new Draft(completion.choices[0]!.message.content!);
        messages.push({
            role: 'user',
            content: `Your answer is rejected: ${rejection.extract()}. Please revise your answer.`,
        });
    }
}
```

### Evaluator

```ts
import { Evaluation, Draft, Rejection, Opposition } from '@zimtsui/iterflow';
import OpenAI from 'openai';
declare const openai: OpenAI;

export async function *evaluate(problem: string): Evaluation.Generator<string, string, string> {
    const input = yield;
    if (input instanceof Draft) {} else throw new Error();
    const draft = input;
    const messages: OpenAI.ChatCompletionMessageParam[] = [
        {
            role: 'system',
            content: [
                'Please examine the given answer of the given math problem.',
                'Print only `ACCEPT` if it is correct.',
            ].join(' '),
        },
        { role: 'user', content: `Problem: ${problem}\n\nAnswer: ${draft.extract()}` },
    ];
    for (;;) {
        const completion = await openai.chat.completions.create({ model: 'gpt-4o', messages });
        messages.push(completion.choices[0]!.message);
        const input = completion.choices[0]!.message.content === 'ACCEPT'
            ? yield
            : yield new Rejection(completion.choices[0]!.message.content!);

        if (input instanceof Draft) {
            const draft = input;
            messages.push({
                role: 'user',
                content: `The answer is updated: ${draft.extract()}\n\nPlease examine it again.`,
            });
        } else if (input instanceof Opposition) {
            const opposition = input;
            messages.push({
                role: 'user',
                content: `Your rejection is opposed: ${opposition.extract()}\n\nPlease examine it again.`,
            });
        }
        else throw new Error();
    }
}
```

### Workflow

```ts
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
```
