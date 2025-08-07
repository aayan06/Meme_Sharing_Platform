
'use server';

/**
 * @fileOverview An AI agent that generates a background image for a custom meme based on a topic.
 *
 * - generateCustomMemeImage - A function that generates a background image.
 * - GenerateCustomMemeImageOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCustomMemeImageOutputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "The generated meme background image as a data URI."
    ),
});
export type GenerateCustomMemeImageOutput = z.infer<typeof GenerateCustomMemeImageOutputSchema>;

export async function generateCustomMemeImage(topic: string): Promise<GenerateCustomMemeImageOutput | null> {
  try {
    return await generateCustomMemeImageFlow(topic);
  } catch (error) {
    console.error("Custom meme image generation flow failed:", error);
    return null;
  }
}

const generateCustomMemeImageFlow = ai.defineFlow(
  {
    name: 'generateCustomMemeImageFlow',
    inputSchema: z.string(),
    outputSchema: GenerateCustomMemeImageOutputSchema,
  },
  async (topic) => {
    
    const prompt = `
      You are an AI assistant that generates a single, high-quality background image for a meme based on this topic: "${topic}".
      
      **CRITICAL RULES FOR THE IMAGE:**
      1.  **NO TEXT AT ALL**: The image MUST be a clean background with ABSOLUTELY NO text, letters, captions, subtitles, signs, or watermarks. It is a blank template. Any image containing any form of text is a failure and is unacceptable, as the user will add their own text later.
      2.  **RELEVANCE**: The image content and emotion MUST directly relate to the topic.
      3.  **HIGH QUALITY**: The image must be clear, high-resolution, and suitable for adding text on top.
    `;

    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: prompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media) {
      throw new Error('Image generation failed: No media object returned.');
    }
    
    return {imageDataUri: media.url};
  }
);
