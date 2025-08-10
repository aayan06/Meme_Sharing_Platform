
'use server';

/**
 * @fileOverview A flow to find the daily meme winner and reward them.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { collection, query, where, orderBy, limit, getDocs, doc, runTransaction, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from '@/lib/firebase';

const RewardDailyWinnerOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  winnerId: z.string().optional(),
  memeId: z.string().optional(),
});
export type RewardDailyWinnerOutput = z.infer<typeof RewardDailyWinnerOutputSchema>;

export async function rewardDailyWinner(): Promise<RewardDailyWinnerOutput> {
  return rewardDailyWinnerFlow();
}

const rewardDailyWinnerFlow = ai.defineFlow(
  {
    name: 'rewardDailyWinnerFlow',
    outputSchema: RewardDailyWinnerOutputSchema,
  },
  async () => {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const memesRef = collection(db, 'memes');
      
      const q = query(
        memesRef,
        where('createdAt', '>', twentyFourHoursAgo),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return { success: true, message: "No memes posted in the last 24 hours." };
      }

      let topMeme: any = null;
      let maxVotes = -1;

      querySnapshot.forEach((doc) => {
        const meme = { id: doc.id, ...doc.data() };
        if (meme.voteCount > maxVotes) {
          maxVotes = meme.voteCount;
          topMeme = meme;
        }
      });

      if (!topMeme || maxVotes === 0) {
        return { success: true, message: "No votes were cast on new memes in the last 24 hours." };
      }

      const winnerRef = doc(db, 'users', topMeme.userId);
      const rewardAmount = 5;

      await runTransaction(db, async (transaction) => {
        const winnerDoc = await transaction.get(winnerRef);
        if (!winnerDoc.exists()) {
          throw new Error(`Winner user with ID ${topMeme.userId} not found.`);
        }
        const newBalance = (winnerDoc.data().hahaBalance || 0) + rewardAmount;
        transaction.update(winnerRef, { hahaBalance: newBalance });
      });

      // Log the win
      await addDoc(collection(db, 'winners'), {
        userId: topMeme.userId,
        memeId: topMeme.id,
        rewardAmount,
        voteCount: topMeme.voteCount,
        createdAt: serverTimestamp(),
      });

      return {
        success: true,
        message: `Successfully rewarded user ${topMeme.userId} with ${rewardAmount} $HAHA for meme ${topMeme.id}.`,
        winnerId: topMeme.userId,
        memeId: topMeme.id,
      };

    } catch (error: any) {
      console.error("Error rewarding daily winner: ", error);
      return {
        success: false,
        message: error.message || "An unexpected error occurred while rewarding the daily winner.",
      };
    }
  }
);
