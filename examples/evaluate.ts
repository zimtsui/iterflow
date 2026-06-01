import { Evaluation, Draft, Critique, Rebuttal } from '@zimtsui/iterflow';
import OpenAI from 'openai';
declare const openai: OpenAI;


export async function *evaluate(problem: string): Evaluation.Generator<string, number, string, string> {
    const input = yield;
    if (input instanceof Draft) {} else throw new Error();
    let draft = input;
    const messages: OpenAI.ChatCompletionMessageParam[] = [
        {
            role: 'system',
            content: [
                'Please examine the given answer of the given math problem.',
                'Print only `APPROVE` if it is correct.',
            ].join(' '),
        },
        { role: 'user', content: `Problem: ${problem}\n\nAnswer: ${draft.extract()}` },
    ];
    for (;;) {
        const completion = await openai.chat.completions.create({ model: 'gpt-4o', messages });
        messages.push(completion.choices[0]!.message);
        const input = completion.choices[0]!.message.content === 'APPROVE'
            ? yield Draft.from(Number.parseInt(draft.extract()))
            : yield Critique.from(completion.choices[0]!.message.content!);

        if (input instanceof Draft) {
            draft = input;
            messages.push({
                role: 'user',
                content: `The answer is updated: ${draft.extract()}\n\nPlease examine it again.`,
            });
        } else if (input instanceof Rebuttal) {
            const rebuttal = input;
            messages.push({
                role: 'user',
                content: `Your critique is challenged: ${rebuttal.extract()}\n\nPlease examine it again.`,
            });
        }
        else throw new Error();
    }
}
