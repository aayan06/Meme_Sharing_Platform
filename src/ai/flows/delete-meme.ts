
'use server';

/**
 * @fileOverview A flow to handle deleting a meme, ensuring only the creator can delete it.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { db, storage } from '@/lib/firebase';

const DeleteMemeInputSchema = z.object({
  memeId: z.string().describe('The ID of the meme to delete.'),
  userId: z.string().describe('The ID of the user attempting to delete the meme.'),
});
export type DeleteMemeInput = z.infer<typeof DeleteMemeInputSchema>;

const DeleteMemeOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type DeleteMemeOutput = z.infer<typeof DeleteMemeOutputSchema>;


export async function deleteMeme(input: DeleteMemeInput): Promise<DeleteMemeOutput> {
  return deleteMemeFlow(input);
}


const deleteMemeFlow = ai.defineFlow(
  {
    name: 'deleteMemeFlow',
    inputSchema: DeleteMemeInputSchema,
    outputSchema: DeleteMemeOutputSchema,
  },
  async ({ memeId, userId }) => {
    try {
        if (!userId) {
            return {
                success: false,
                message: "User not authenticated.",
            };
        }

        const memeRef = doc(db, 'memes', memeId);
        const memeDoc = await getDoc(memeRef);

        if (!memeDoc.exists()) {
            throw new Error("Meme not found.");
        }

        const memeData = memeDoc.data();

        if (memeData.userId !== userId) {
            return {
                success: false,
                message: "You are not authorized to delete this meme.",
            };
        }

        // Only attempt to delete from storage if authorized and an image URL exists
        if (memeData.imageUrl) {
            try {
                 // Create a reference from the full HTTPS URL
                 const imageRef = ref(storage, memeData.imageUrl);
                 await deleteObject(imageRef);
            } catch (storageError: any) {
                // Log storage error but don't block firestore deletion
                console.error(`Failed to delete image from storage: ${storageError.message}`);
                 if (storageError.code !== 'storage/object-not-found') {
                    // If it's a permission error or something else, we might want to throw
                    // to indicate a bigger problem (like misconfigured rules).
                    throw new Error(`Storage deletion failed: ${storageError.message}`);
                 }
            }
        }
        
        // Delete the document from Firestore
        await deleteDoc(memeRef);

        return {
            success: true,
            message: "Meme successfully deleted.",
        };

    } catch (error: any) {
      console.error("Meme deletion failed: ", error);
      return {
        success: false,
        message: error.message || "An unexpected error occurred while deleting the meme.",
      };
    }
  }
);
