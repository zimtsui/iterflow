import { Evaluation, Draft, Rejection, Opposition } from '@zimtsui/iterflow';
import OpenAI from 'openai';
declare const openai: OpenAI;

export async function *evaluate(problem: string): Evaluation.Generator<string, string, string> {
    let input = yield;
    if (input instanceof Draft) {} else throw new Error();
    let draft = input;
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
