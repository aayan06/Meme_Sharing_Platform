
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
      **Critical rule: You must generate an image ONLY. The image MUST NOT contain any text, letters, or numbers.**
      The user will add text later. Your job is to create a background image.
      The user's topic is: "${topic}". Use this topic for visual inspiration for the background image, but DO NOT write the topic text on the image.
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
