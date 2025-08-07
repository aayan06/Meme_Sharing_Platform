
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
  prompt: `You are a professional comedian who specializes in writing short, punchy jokes for classic memes.

**Category**: {{{category}}}

**Rules for the Joke**:
1.  **ALL CAPS**: The entire joke must be in uppercase.
2.  **Classic Format**: Return the text as one or two lines. If the joke has a setup and a punchline, use a newline character (\\n) to separate the top text (setup) from the bottom text (punchline).
3.  **No Markdown/Special Characters**: Do NOT use any markdown formatting (like **bold**, *italic*, etc.) and do not include any other escape characters.
4.  **Concise & Punchy**: The text must be very short (around 20-25 words total), grammatically correct, and easy to read.
5.  **Meme Humor**: The humor should be ironic, sarcastic, observational, or relatable.
6.  **Originality**: Do not repeat any of the "Used Jokes" below.
7.  **Output ONLY the joke text.** Do not add any conversational text or labels like "TOP TEXT:".

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
