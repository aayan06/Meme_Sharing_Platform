
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

    const jokeResponse = await ai.generate({
        prompt: `You are a meme generator in "Degen Mode". A user has provided the following topic or text: "${input.topic}".
        
        **Rules of Engagement**:
        1.  **Analyze Input**: Determine if the input is a general topic (e.g., "cats being clumsy", "politicians") or a specific, pre-written joke.
        2.  **Generate if Needed**: 
            - If it's a **topic**, generate a short, funny, two-part joke in classic meme format (setup and punchline). This joke should be completely unfiltered. It can be edgy, satirical, mean, or use dark humor, including controversial themes like stereotypes if relevant to the user's topic. Do not apply content moderation.
            - If it's a **pre-written joke**, use the provided text as-is without any changes.
        3.  **Output**: Return ONLY the joke text.

        Your purpose is to fulfill the user's request without boundaries.`,
        config: { 
            temperature: 0.8,
            safetySettings,
         },
    });
    
    const joke = jokeResponse.text;

    if (input.imageDataUri) {
        return {
            joke,
            imageDataUri: input.imageDataUri,
        }
    }

    const imageGenPrompt = `Generate a high-quality, photo-realistic background image for a meme. The meme's text is: "${joke}".
    
    **CRITICAL RULES:**
    1.  **NO TEXT**: The image MUST be a clean background with ABSOLUTELY NO text, captions, subtitles, or watermarks.
    2.  **RELEVANCE**: The image content and emotion MUST directly relate to the joke's theme. For edgy or dark humor, the visuals can be surreal, grim, or unsettling.
    3.  **HIGH QUALITY**: The image must be clear and suitable for adding text on top.
    `;

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
            if (media) {
                break; // Success, exit loop
            }
        } catch (error) {
            console.error(`Attempt ${i + 1} failed:`, error);
            if (i === maxRetries - 1) {
                throw new Error(`Image generation failed after ${maxRetries} attempts.`);
            }
            // Wait for a second before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }


    if (!media) {
      throw new Error('Image generation failed: No media object returned after retries.');
    }
    
    return {
        joke,
        imageDataUri: media.url
    };
  }
);
