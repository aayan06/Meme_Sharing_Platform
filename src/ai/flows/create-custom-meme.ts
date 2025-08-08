
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
   imageDataUri: z.string().optional().describe(
      "An optional photo provided by the user, as a data URI."
    ),
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
    
    // If the user provided finished text, just return it.
    if (input.topic.length >= 50 || input.topic.includes('||')) {
        return { joke: input.topic.toUpperCase() };
    }

    const basePrompt = `Generate a single meme caption using this exact format:

- Return one string only, formatted as: "TOP TEXT || BOTTOM TEXT"
- Do NOT include duplicate lines, repeated phrases, or text used in both top and bottom.
- Do NOT include escape characters like \\n, \\r, or any markdown or punctuation symbols.
- Use a clean, original caption that has never been used before.
- Keep the total word count under 20 words.
- Example: "WHEN YOU ACCIDENTALLY DIAL 911 || YOU JUST HANG UP AND HOPE FOR THE BEST"

If the output does not strictly follow this "top || bottom" format with no extra characters or repeats, discard and regenerate.
`;

    // If an image is provided, generate text for that image.
    if (input.imageDataUri) {
         const jokeResponse = await ai.generate({
            prompt: [
                {text: `${basePrompt}
                **Task**: Analyze the provided image and generate a funny joke that relates to BOTH the image and this topic: "${input.topic}".
                `},
                {media: {url: input.imageDataUri}},
            ],
            config: { 
                temperature: 0.8,
                safetySettings,
            },
        });
        return { joke: jokeResponse.text };
    }
    
    // Otherwise, generate a joke from the topic alone.
    const jokeResponse = await ai.generate({
        prompt: `${basePrompt}
        **Task**: Generate a short, funny joke based on this topic: "${input.topic}".`,
        config: { 
            temperature: 0.8,
            safetySettings,
         },
    });
    
    return {
        joke: jokeResponse.text,
    };
  }
);
