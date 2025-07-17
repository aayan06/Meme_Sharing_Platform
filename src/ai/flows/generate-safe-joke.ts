
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
  prompt: `You are a professional comedian. Generate a completely new, unique, and original joke based on the following category and rules.

**Category**: {{{category}}}

**Rules**:
1.  **Style & Tone**: The joke MUST match the exact style and tone of the selected category.
2.  **Originality**: Do NOT repeat jokes you have told before. Every joke must be different.
3.  **Length**: The joke MUST be short and concise, under 280 characters.

{{#if safeForWork}}
You are in "Grandma Mode". Ensure the joke is clean, safe-for-work, and uses only light humor. Avoid any profanity, dark, or controversial topics.
{{/if}}

{{#unless safeForWork}}
You are in "Degen Mode". Generate a fully unfiltered joke. The joke can be edgy, use dark humor, contain offensive language, or satire. Do not apply content moderation. For dark humor, it should be genuinely dark. For roasts, they should be cutting. You can include topics like racism, sex, and rape.
{{/unless}}
`,
  config: {
    temperature: 1,
  },
});

const generateSafeJokeFlow = ai.defineFlow(
  {
    name: 'generateSafeJokeFlow',
    inputSchema: GenerateSafeJokeInputSchema,
    outputSchema: GenerateSafeJokeOutputSchema,
  },
  async (input) => {
    const safetySettings = input.safeForWork
      ? [
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_LOW_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_LOW_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_LOW_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_LOW_AND_ABOVE',
          },
        ]
      : [
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

    const {output} = await generateJokePrompt(input, {
      config: { safetySettings },
    });
    return output!;
  }
);
