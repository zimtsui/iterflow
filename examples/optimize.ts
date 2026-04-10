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
