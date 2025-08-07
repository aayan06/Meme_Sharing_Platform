
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
  textPlacement: z.object({
        top: z.object({
            x: z.number().describe("X coordinate for top text block (percentage)."),
            y: z.number().describe("Y coordinate for top text block (percentage)."),
            width: z.number().describe("Width of the top text block (percentage)."),
            height: z.number().describe("Height of the top text block (percentage)."),
        }),
        bottom: z.object({
            x: z.number().describe("X coordinate for bottom text block (percentage)."),
            y: z.number().describe("Y coordinate for bottom text block (percentage)."),
            width: z.number().describe("Width of the top text block (percentage)."),
            height: z.number().describe("Height of the top text block (percentage)."),
        }),
    }).describe("Coordinates for placing the text on the image to avoid key features.").optional(),
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
    if (input.topic.length >= 50 || input.topic.includes('\n')) {
        return { joke: input.topic.toUpperCase() };
    }

    const basePrompt = `You are a professional comedian who specializes in writing short, punchy jokes for classic memes.

**Rules for the Joke**:
1.  **ALL CAPS**: The entire joke must be in uppercase.
2.  **Classic Format**: Return the text as one or two lines. If the joke has a setup and a punchline, use a newline character (\\n) to separate the top text (setup) from the bottom text (punchline).
3.  **No Markdown/Special Characters**: Do NOT use any markdown formatting (like **bold**, *italic*, etc.) and do not include any other escape characters.
4.  **Concise & Punchy**: The text must be very short (around 20-25 words total), grammatically correct, and easy to read.
5.  **Meme Humor**: The humor should be ironic, sarcastic, observational, or relatable.
6.  **Output ONLY the joke text.** Do not add any conversational text or labels like "TOP TEXT:".
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
