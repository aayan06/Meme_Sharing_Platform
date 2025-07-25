
'use server';

/**
 * @fileOverview An AI agent that creates the final meme image by overlaying text on a background.
 *
 * - createFinalMeme - A function that handles the final meme creation and submission process.
 * - CreateFinalMemeInput - The input type for the createFinalMeme function.
 * - CreateFinalMemeOutput - The return type for the createFinalMeme function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { submitMeme } from './submit-meme';

const CreateFinalMemeInputSchema = z.object({
  userId: z.string().describe('The ID of the user submitting the meme.'),
  joke: z.string().describe("The text for the meme."),
  backgroundImageDataUri: z.string().describe(
    "The background image for the meme as a data URI. Format: 'data:<mimetype>;base64,<encoded_data>'."
  ),
});
export type CreateFinalMemeInput = z.infer<typeof CreateFinalMemeInputSchema>;

const CreateFinalMemeOutputSchema = z.object({
  memeId: z.string().describe('The ID of the newly created meme document.'),
  imageUrl: z.string().describe('The public URL of the uploaded meme image.'),
});
export type CreateFinalMemeOutput = z.infer<typeof CreateFinalMemeOutputSchema>;


export async function createFinalMeme(input: CreateFinalMemeInput): Promise<CreateFinalMemeOutput> {
    return createFinalMemeFlow(input);
}


const createFinalMemeFlow = ai.defineFlow(
  {
    name: 'createFinalMemeFlow',
    inputSchema: CreateFinalMemeInputSchema,
    outputSchema: CreateFinalMemeOutputSchema,
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

    const imageGenPrompt = [
        { media: { url: input.backgroundImageDataUri } },
        { text: `Overlay the following text onto the image as a classic meme.
        
        Text: "${input.joke}"
        
        **CRITICAL RULES:**
        1.  **FONT**: Use a bold, white, all-caps font like Impact.
        2.  **OUTLINE**: The font MUST have a thick black outline to ensure readability on any background.
        3.  **PLACEMENT**: Split the text into a top line and a bottom line, placing them at the top-center and bottom-center of the image, respectively.
        4.  **INTEGRITY**: Do not change the original image in any other way.`
        },
    ];

    const {media: finalMemeImage} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: imageGenPrompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
        safetySettings,
      },
    });

    if (!finalMemeImage) {
      throw new Error('Final meme image generation failed: No media object returned.');
    }
    
    // Now submit this final, composed image to storage and Firestore.
    const submissionResult = await submitMeme({
        userId: input.userId,
        joke: input.joke,
        imageDataUri: finalMemeImage.url,
    });

    return submissionResult;
  }
);
