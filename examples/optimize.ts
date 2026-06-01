import { Optimization, Draft, Rebuttal } from '@zimtsui/debateflow';
import OpenAI from 'openai';
declare const openai: OpenAI;


export async function *optimize(problem: string): Optimization.Generator<string, string, string> {
    const messages: OpenAI.ChatCompletionMessageParam[] = [
        {
            role: 'system',
            content: [
                'Please solve math problems.',
                'Your answer will be evaluated and the feedback will be provided if the answer is rejected.',
                'Output "CHALLENGE" to insist your answer.'
            ].join(' ')
        },
        { role: 'user', content: problem },
    ];
    for (;;) {
        const completion = await openai.chat.completions.create({ model: 'gpt-4o', messages });
        messages.push(completion.choices[0]!.message);
        const critique = completion.choices[0]!.message.content! === 'CHALLENGE'
            ? yield Rebuttal.from('My answer is correct.')
            : yield Draft.from(completion.choices[0]!.message.content!);
        messages.push({
            role: 'user',
            content: `Your answer is rejected: ${critique.extract()}. Please revise your answer.`,
        });
    }
}
