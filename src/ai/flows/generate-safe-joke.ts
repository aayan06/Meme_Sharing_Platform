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

const filterJokeTool = ai.defineTool({
  name: 'filterJoke',
  description: 'Checks if a joke is safe for work. Returns true if it is, false otherwise.',
  inputSchema: z.object({
    joke: z.string().describe('The joke to check.'),
  }),
  outputSchema: z.boolean(),
}, async (input) => {
  // Placeholder implementation for joke filtering.  Replace with actual filtering logic.
  // This is UNSAFE and should only be used with an actual implementation of a filter.
  // In a real application, this would use an external API or a local content filter.
  return true;
});

const generateJokePrompt = ai.definePrompt({
  name: 'generateJokePrompt',
  tools: [filterJokeTool],
  input: {schema: GenerateSafeJokeInputSchema},
  output: {schema: GenerateSafeJokeOutputSchema},
  prompt: `You are a joke generator. Generate a joke based on the following category:

Category: {{{category}}}

{{#if safeForWork}}
Ensure the joke is safe for work.
{{/if}}

{{#unless safeForWork}}
Generate the joke without any content restrictions.
{{/unless}}
`,
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
