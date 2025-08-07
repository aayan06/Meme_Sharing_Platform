
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
  prompt: `Generate a meme caption in classic meme format using these rules:

- Return only one caption with two parts: top and bottom text.
- Do NOT include the same text twice. Return only the final result once.
- Use ALL CAPS for both lines.
- Use plain text only — no escape characters like \\n, \\\\n, or markdown.
- Separate top and bottom text with || (double pipe) ONLY.
- Output format should be: "TOP TEXT HERE || BOTTOM TEXT HERE"
- Keep the joke under 25 words total.
- Use meme-style humor: sarcastic, ironic, observational, or relatable.
- DO NOT return both a top caption and a rendered version — just the formatted meme caption.

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
