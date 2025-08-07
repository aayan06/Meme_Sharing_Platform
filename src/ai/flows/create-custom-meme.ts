
'use server';

/**
 * @fileOverview An AI agent that creates a custom meme from a user's topic.
 *
 * - createCustomMeme - A function that handles the custom meme creation process.
 * - CreateCustomMemeInput - The input type for the createCustomMeme function.
 * - CreateCustomMemeOutput - The return type for the createCustomMeme function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CreateCustomMemeInputSchema = z.object({
  topic: z.string().describe("The user's description of the meme idea or the exact text for the meme."),
});
export type CreateCustomMemeInput = z.infer<typeof CreateCustomMemeInputSchema>;

const CreateCustomMemeOutputSchema = z.object({
  joke: z.string().describe('The generated joke or the original text.'),
});
export type CreateCustomMemeOutput = z.infer<typeof CreateCustomMemeOutputSchema>;


export async function createCustomMeme(input: CreateCustomMemeInput): Promise<CreateCustomMemeOutput> {
    return createCustomMemeFlow(input);
}


const createCustomMemeFlow = ai.defineFlow(
  {
    name: 'createCustomMemeFlow',
    inputSchema: CreateCustomMemeInputSchema,
    outputSchema: CreateCustomMemeOutputSchema,
  },
  async (input) => {

    const safetySettings = [
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_NONE',
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_NONE',
        },
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_NONE',
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_NONE',
        },
    ];

    let joke = input.topic;
    
    // If the topic seems like a prompt rather than finished text, generate a joke.
    if (input.topic.length < 50 && !input.topic.includes('\n')) {
        const jokeResponse = await ai.generate({
            prompt: `You are a meme generator. A user has provided the following topic: "${input.topic}".
            
            **Rules of Engagement**:
            1.  Generate a short, funny joke in classic meme format (e.g., a setup and punchline) based on the topic.
            2.  Output ONLY the joke text. Do not add any conversational text like "Here's a joke:".
            `,
            config: { 
                temperature: 0.8,
                safetySettings,
             },
        });
        joke = jokeResponse.text;
    }
    
    return {
        joke,
    };
  }
);
