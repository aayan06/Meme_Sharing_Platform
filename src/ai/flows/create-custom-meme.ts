
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
import sharp from 'sharp';

const CreateCustomMemeInputSchema = z.object({
  topic: z.string().describe("The user's description of the meme idea or the exact text for the meme."),
  imageDataUri: z.string().optional().describe(
    "An optional user-uploaded image as a data URI. Format: 'data:<mimetype>;base64,<encoded_data>'."
  ),
  regenerateTopic: z.string().optional().describe('An optional topic to regenerate a joke from, ensuring the new joke is a variation of the old one.')
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
    let finalImageDataUri = input.imageDataUri;
    
    // If regenerating, create a variation. Otherwise, generate a new joke if needed.
    if (input.regenerateTopic) {
         const jokeResponse = await ai.generate({
            prompt: `You are a meme generator. A user wants a new joke based on this topic: "${input.regenerateTopic}". 
            Generate a short, funny joke in classic meme format. Output ONLY the joke text. Make it different from the original but on the same theme.`,
            config: { 
                temperature: 0.9,
                safetySettings,
             },
        });
        joke = jokeResponse.text;
    } else if (input.topic.length < 50 && !input.topic.includes('\n')) {
        const jokeResponse = await ai.generate({
            prompt: `You are a meme generator. A user has provided the following topic: "${input.topic}".
            
            **Rules of Engagement**:
            1.  Generate a short, funny joke in classic meme format (e.g., a setup and punchline) based on the topic.
            2.  Output ONLY the joke text. Do not add any conversational text like "Here's a joke:".
            `,
            config: { 
                temperature: 0.8,
                safetySettings,
             },
        });
        joke = jokeResponse.text;
    }

    // If the user did NOT upload an image, generate one based on the joke/topic.
    if (!finalImageDataUri) {
        const imageGenPrompt = `Generate a high-quality, photorealistic background image for a meme. The image content MUST directly relate to the theme of this joke: "${joke}". CRITICAL: The image MUST be a clean background with ABSOLUTELY NO TEXT, captions, or words.`;

        const {media} = await ai.generate({
            model: 'googleai/gemini-2.0-flash-preview-image-generation',
            prompt: imageGenPrompt,
            config: {
                responseModalities: ['TEXT', 'IMAGE'],
                safetySettings,
            },
        });

        if (!media?.url) {
          throw new Error('Image generation failed: No media object was returned by the model.');
        }
        finalImageDataUri = media.url;
    }
    
    // Convert data URI to buffer for compression
    const base64Data = finalImageDataUri.split(',')[1];
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Compress the image
    const compressedImageBuffer = await sharp(imageBuffer)
        .jpeg({ quality: 80 }) // Compress to JPEG with 80% quality
        .toBuffer();
    
    // Convert compressed buffer back to data URI
    const compressedImageDataUri = `data:image/jpeg;base64,${compressedImageBuffer.toString('base64')}`;
    
    return {
        joke,
        imageDataUri: compressedImageDataUri,
    };
  }
);
