
'use server';

/**
 * @fileOverview A flow to handle deleting all memes from the leaderboard.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { collection, getDocs, writeBatch } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { db, storage } from '@/lib/firebase';

const DeleteAllMemesOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type DeleteAllMemesOutput = z.infer<typeof DeleteAllMemesOutputSchema>;

export async function deleteAllMemes(): Promise<DeleteAllMemesOutput> {
  return deleteAllMemesFlow();
}

const deleteAllMemesFlow = ai.defineFlow(
  {
    name: 'deleteAllMemesFlow',
    outputSchema: DeleteAllMemesOutputSchema,
  },
  async () => {
    try {
      const memesCollection = collection(db, 'memes');
      const querySnapshot = await getDocs(memesCollection);

      if (querySnapshot.empty) {
        return {
            success: true,
            message: "There are no memes to delete.",
        };
      }

      // Delete images from Storage
      for (const doc of querySnapshot.docs) {
          const memeData = doc.data();
          if (memeData.imageUrl) {
              try {
                  const imageRef = ref(storage, memeData.imageUrl);
                  await deleteObject(imageRef);
              } catch (storageError: any) {
                  // Log error but continue
                   console.error(`Failed to delete image ${memeData.imageUrl}: ${storageError.message}`);
              }
          }
      }

      // Batch delete documents from Firestore
      const batch = writeBatch(db);
      querySnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      return {
        success: true,
        message: `Successfully deleted ${querySnapshot.size} memes.`,
      };

    } catch (error: any) {
      console.error("Meme deletion failed: ", error);
      return {
        success: false,
        message: error.message || "An unexpected error occurred while deleting all memes.",
      };
    }
  }
);
