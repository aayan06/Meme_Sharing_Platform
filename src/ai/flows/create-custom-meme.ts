
'use server';

/**
 * @fileOverview An AI agent that creates a custom meme from a user's topic and optional image.
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
    "An optional user-uploaded image as a data URI. Format: 'data:<mimetype>;base64,<encoded_data>'."
  ),
});
export type CreateCustomMemeInput = z.infer<typeof CreateCustomMemeInputSchema>;

const CreateCustomMemeOutputSchema = z.object({
  joke: z.string().describe('The generated joke or the original text.'),
  imageDataUri: z
    .string()
    .describe(
      "The generated or provided meme image as a data URI."
    ),
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

    // Only generate a joke if the input seems like a topic, not pre-written text.
    // A simple heuristic: if it's long or contains line breaks, it's likely pre-written.
    if (input.topic.length < 50 && !input.topic.includes('\n')) {
        const jokeResponse = await ai.generate({
            prompt: `You are a meme generator. A user has provided the following topic: "${input.topic}".
            
            **Rules of Engagement**:
            1.  Generate a short, funny, two-part joke in classic meme format (setup and punchline) based on the topic.
            2.  Output ONLY the joke text. Do not add any conversational text like "Here's a joke:".
            `,
            config: { 
                temperature: 0.8,
                safetySettings,
             },
        });
        joke = jokeResponse.text;
    }
    

    // Determine Top and Bottom text for the meme
    const splitJoke = (text: string): { top: string; bottom: string } => {
        if (!text) return { top: '', bottom: '' };
        const sentences = text.match(/[^.!?]+[.!?\n]+/g) || [];
        if (sentences.length >= 2) {
            const middleIndex = Math.ceil(sentences.length / 2);
            const top = sentences.slice(0, middleIndex).join(' ').trim();
            const bottom = sentences.slice(middleIndex).join(' ').trim();
            return { top, bottom };
        }
        const words = text.split(' ');
        if (words.length <= 1) return { top: text, bottom: '' };
        const middleIndex = Math.ceil(words.length / 2);
        const top = words.slice(0, middleIndex).join(' ');
        const bottom = words.slice(middleIndex).join(' ');
        return { top, bottom };
    };
    const { top, bottom } = splitJoke(joke);

    const imageGenPrompt = input.imageDataUri 
    ? [
        {text: `Overlay the following text onto this image in a classic meme format (bold, white, all-caps font with black outline). Top: "${top}" Bottom: "${bottom}". Do not change the underlying image.`},
        {media: {url: input.imageDataUri}}
      ]
    : `You are a meme generator. Generate a single, high-quality, photo-realistic image for a meme. The meme text is:
        - Top text: "${top}"
        - Bottom text: "${bottom}"

        **CRITICAL RULES:**
        1.  **INCLUDE TEXT ON IMAGE**: The image MUST be a complete meme with the text rendered directly on it. Use a classic, bold, white, all-caps font (like Impact) with a black outline.
        2.  **RELEVANCE**: The image content and emotion MUST directly relate to the joke's theme.
        3.  **HIGH QUALITY**: The final image must be clear and high-resolution.
        4.  **NO EXTRA TEXT**: Do not add any other text, watermarks, or artifacts.`;


    let media;
    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await ai.generate({
                model: 'googleai/gemini-2.0-flash-preview-image-generation',
                prompt: imageGenPrompt,
                config: {
                    responseModalities: ['TEXT', 'IMAGE'],
                    safetySettings,
                },
            });
            media = response.media;
            if (media?.url) {
                break; // Success, exit loop
            }
        } catch (error) {
            console.error(`Image generation attempt ${i + 1} failed:`, error);
            if (i === maxRetries - 1) {
                throw new Error(`Image generation failed after ${maxRetries} attempts.`);
            }
            // Wait for a second before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }


    if (!media?.url) {
      throw new Error('Image generation failed: No media object returned after retries.');
    }
    
    return {
        joke,
        imageDataUri: media.url
    };
  }
);
