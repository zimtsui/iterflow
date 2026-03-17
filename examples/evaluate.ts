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
