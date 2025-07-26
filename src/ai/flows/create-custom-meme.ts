
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

    let imageGenPrompt;
    if (input.imageDataUri) {
        imageGenPrompt = [
            {text: `Using the provided image, create a meme. Add the following text in a classic meme format (bold, white, all-caps font with a black outline). Do not change the underlying image. Top text: "${top}". Bottom text: "${bottom}".`},
            {media: {url: input.imageDataUri}}
        ];
    } else {
        imageGenPrompt = `Generate a photorealistic image for a meme. The image content must match the joke's theme: "${joke}". Then, render the text on the image in a bold, white, all-caps font with a black outline. Top text: "${top}". Bottom text: "${bottom}".`;
    }

    const {media} = await ai.generate({
        model: 'googleai/gemini-1.5-flash-latest',
        prompt: imageGenPrompt,
        config: {
            safetySettings,
        },
    });


    if (!media?.url) {
      throw new Error('Image generation failed: No media object was returned by the model.');
    }

    // Convert data URI to buffer for compression
    const base64Data = media.url.split(',')[1];
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
