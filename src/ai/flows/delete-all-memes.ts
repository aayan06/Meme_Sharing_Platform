
'use server';

/**
 * @fileOverview A flow to handle deleting all memes from the leaderboard.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { collection, getDocs, writeBatch } from "firebase/firestore";
import { db } from '@/lib/firebase';
import { adminStorage } from '@/lib/firebase-admin';

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

      // Delete images from Storage using the Admin SDK
      for (const doc of querySnapshot.docs) {
          const memeData = doc.data();
          if (memeData.imageUrl) {
              try {
                  const url = new URL(memeData.imageUrl);
                  const filePath = decodeURIComponent(url.pathname.split('/').slice(5).join('/'));
                  const file = adminStorage.bucket().file(filePath);
                  await file.delete();
              } catch (storageError: any) {
                  // Log error but continue
                   console.error(`Admin SDK failed to delete image ${memeData.imageUrl}: ${storageError.message}`);
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
