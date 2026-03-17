# Iterflow

[![Npm package version](https://img.shields.io/npm/v/@zimtsui/iterflow?style=flat-square)](https://www.npmjs.com/package/@zimtsui/iterflow)

Iterflow is an AI workflow orchestrator specifically designed for Optimizer-Evaluator design patterns.

## Examples

### Optimizer

```ts
import { Opposition, Optimization, Rejection } from '@zimtsui/iterflow';
import OpenAI from 'openai';
declare const openai: OpenAI;

export async function *optimize(problem: string): Optimization.Raw<string> {
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
            return yield new Opposition('My answer is correct.');
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

export async function *evaluate(problem: string): Evaluation.Raw<string> {
    let draft = yield new Evaluation.FirstYield();
    const messages: OpenAI.ChatCompletionMessageParam[] = [
        {
            role: 'system',
            content: [
                'Please examine the given answer of the given math problem.',
                'Print only `ACCEPT` if it is correct.',
            ].join(' '),
        },
        { role: 'user', content: `Problem: ${problem}\n\nAnswer: ${draft}` },
    ];
    for (;;) try {
        const completion = await openai.chat.completions.create({ model: 'gpt-4o', messages });
        messages.push(completion.choices[0]!.message);
        if (completion.choices[0]!.message.content === 'ACCEPT') draft = yield draft;
        else draft = yield new Rejection(completion.choices[0]!.message.content!);
        messages.push({
            role: 'user',
            content: `The answer is updated: ${draft}\n\nPlease examine it again.`,
        });
    } catch (e) {
        if (e instanceof Opposition) {} else throw e;
        messages.push({
            role: 'user',
            content: `Your rejection is opposed: ${e.message}\n\nPlease examine it again.`,
        });
    }
}
```

### Workflow

```ts
import { Optimization, Evaluation, opteva, Rejection } from '@zimtsui/iterflow';
import { optimize } from './optimize.ts';
import { evaluate } from './evaluate.ts';
const evaluate1: (problem: string) => Evaluation.Raw<string, string> = evaluate;
declare const evaluate2: (problem: string) => Evaluation.Raw<string, number>;
declare const evaluate3: (problem: string) => Evaluation.Raw<number, number>;

export async function workflow(problem: string): Promise<number> {
    await using optimization = Optimization.Cache.from(optimize(problem));
    await using evaluation1 = await Evaluation.Initialized.from(evaluate1(problem));
    await using evaluation2 = await Evaluation.Initialized.from(evaluate2(problem));
    await using evaluation3 = await Evaluation.Initialized.from(evaluate3(problem));
    for (;;) try {
        let snapshotString = Optimization.Snapshot.from(optimization);
        snapshotString = await opteva(snapshotString, evaluation1);
        let snapshotNumber = await opteva(snapshotString, evaluation2);
        snapshotNumber = await opteva(snapshotNumber, evaluation3);
        return await snapshotNumber.next().then(r => r.value);
    } catch (e) {
        if (e instanceof Rejection) {} else throw e;
    }
};
```

## Subtypes

```mermaid
classDiagram

Optimization <|.. Optimization.Cache
Optimization.Raw <|.. Optimization
class Optimization.Snapshot

Evaluation.Raw <|.. Evaluation
class Evaluation.Initialized
```
