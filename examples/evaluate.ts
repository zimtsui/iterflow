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
