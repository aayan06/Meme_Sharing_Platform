
'use server';

/**
 * @fileOverview A flow to handle meme submission, including image upload and Firestore entry.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { v4 as uuidv4 } from 'uuid';
import { db, storage } from '@/lib/firebase';


const SubmitMemeInputSchema = z.object({
  userId: z.string().describe('The ID of the user submitting the meme.'),
  joke: z.string().describe('The text content of the meme.'),
  imageDataUri: z.string().describe("The meme image as a data URI."),
});
export type SubmitMemeInput = z.infer<typeof SubmitMemeInputSchema>;

const SubmitMemeOutputSchema = z.object({
  memeId: z.string().describe('The ID of the newly created meme document.'),
  imageUrl: z.string().describe('The public URL of the uploaded meme image.'),
});
export type SubmitMemeOutput = z.infer<typeof SubmitMemeOutputSchema>;


export async function submitMeme(input: SubmitMemeInput): Promise<SubmitMemeOutput> {
  return submitMemeFlow(input);
}


const submitMemeFlow = ai.defineFlow(
  {
    name: 'submitMemeFlow',
    inputSchema: SubmitMemeInputSchema,
    outputSchema: SubmitMemeOutputSchema,
  },
  async ({ userId, joke, imageDataUri }) => {
    
    // 1. Upload image to Firebase Storage
    const imageRef = ref(storage, `memes/${userId}/${uuidv4()}.png`);
    
    // The data URI needs to be stripped of its prefix before uploading
    const base64Data = imageDataUri.split(',')[1];
    
    const snapshot = await uploadString(imageRef, base64Data, 'base64', {
        contentType: 'image/png'
    });
    const imageUrl = await getDownloadURL(snapshot.ref);

    // 2. Create document in Firestore
    const memesCollection = collection(db, 'memes');
    const newMemeDoc = await addDoc(memesCollection, {
      userId,
      joke,
      imageUrl,
      createdAt: serverTimestamp(),
      voteCount: 0,
      voters: [],
    });

    // Return the new meme's ID and image URL
    return {
      memeId: newMemeDoc.id,
      imageUrl,
    };
  }
);
