
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
  usedJokes: z.array(z.string()).optional().describe('A list of jokes that have already been generated to avoid repetition.'),
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
  prompt: `Generate a single meme caption using this exact format:

- Return one string only, formatted as: "TOP TEXT || BOTTOM TEXT"
- Do NOT include duplicate lines, repeated phrases, or text used in both top and bottom.
- Do NOT include escape characters like \\n, \\r, or any markdown or punctuation symbols.
- Use a clean, original caption that has never been used before.
- Keep the total word count under 20 words.
- Example: "WHEN YOU ACCIDENTALLY DIAL 911 || YOU JUST HANG UP AND HOPE FOR THE BEST"

If the output does not strictly follow this "top || bottom" format with no extra characters or repeats, discard and regenerate.

**Category**: {{{category}}}

**Originality**: Do not repeat any of the "Used Jokes" below.
**Used Jokes (Avoid These)**:
{{#if usedJokes}}
{{#each usedJokes}}
- {{{this}}}
{{/each}}
{{else}}
None yet.
{{/if}}

{{#if safeForWork}}
**Content Filter**: "Grandma Mode" is ON. The joke must be clean and safe-for-work. Avoid profanity, dark, or controversial topics.
{{/if}}

{{#unless safeForWork}}
**Content Filter**: "Degen Mode" is ON. The joke can be edgy, use dark humor, or contain satire.
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
    // Looser safety settings to prevent the model from breaking the format.
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

    const {output} = await generateJokePrompt(input, {
      config: { safetySettings },
    });
    return output!;
  }
);
