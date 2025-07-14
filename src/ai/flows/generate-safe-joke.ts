'use server';

/**
 * @fileOverview An AI agent that generates jokes based on a category, filtering for safe-for-work humor by default.
 *
 * - generateSafeJoke - A function that generates safe-for-work jokes based on the selected category.
 * - GenerateSafeJokeInput - The input type for the generateSafeJoke function.
 * - GenerateSafeJokeOutput - The return type for the generateSafeJoke function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateSafeJokeInputSchema = z.object({
  category: z.string().describe('The category of joke to generate (e.g., dad jokes, dark humor, pick-up lines).'),
  safeForWork: z.boolean().default(true).describe('Whether the joke should be safe for work. Defaults to true.'),
});
export type GenerateSafeJokeInput = z.infer<typeof GenerateSafeJokeInputSchema>;

const GenerateSafeJokeOutputSchema = z.object({
  joke: z.string().describe('The generated joke.'),
});
export type GenerateSafeJokeOutput = z.infer<typeof GenerateSafeJokeOutputSchema>;

export async function generateSafeJoke(input: GenerateSafeJokeInput): Promise<GenerateSafeJokeOutput> {
  return generateSafeJokeFlow(input);
}

const generateJokePrompt = ai.definePrompt({
  name: 'generateJokePrompt',
  input: {schema: GenerateSafeJokeInputSchema},
  output: {schema: GenerateSafeJokeOutputSchema},
  prompt: `You are a joke generator. Generate a new, unique joke based on the following category:

Category: {{{category}}}

{{#if safeForWork}}
Ensure the joke is safe for work.
{{/if}}

{{#unless safeForWork}}
The joke can be NSFW and should not have content restrictions. For dark humor, it should be genuinely dark.
{{/unless}}
`,
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_NONE',
      },
    ],
  },
});

const generateSafeJokeFlow = ai.defineFlow(
  {
    name: 'generateSafeJokeFlow',
    inputSchema: GenerateSafeJokeInputSchema,
    outputSchema: GenerateSafeJokeOutputSchema,
  },
  async input => {
    const {output} = await generateJokePrompt(input);
    return output!;
  }
);
