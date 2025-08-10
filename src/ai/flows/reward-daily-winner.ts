
'use server';

/**
 * @fileOverview A flow to find the daily meme winner and reward them. This flow is idempotent.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { collection, query, where, orderBy, limit, getDocs, doc, runTransaction, addDoc, serverTimestamp, setDoc, getDoc } from "firebase/firestore";
import { db } from '@/lib/firebase';
import { adminDb } from '@/lib/firebase-admin';

const RewardDailyWinnerOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  winnerId: z.string().optional(),
  memeId: z.string().optional(),
  skipped: z.boolean().optional(),
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
    // This flow needs the Admin SDK to perform the idempotent check reliably.
    if (!adminDb) {
        const errorMsg = "Server is not configured for this action. Missing Firebase Admin credentials.";
        console.error(`rewardDailyWinnerFlow: ${errorMsg}`);
        return {
            success: false,
            message: errorMsg,
        };
    }

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format
    const rewardRef = doc(adminDb, 'daily_rewards', today);
    
    try {
        const rewardSnap = await getDoc(rewardRef);
        if (rewardSnap.exists()) {
            return {
                success: true,
                skipped: true,
                message: `Daily reward for ${today} has already been processed.`,
            };
        }
      
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const memesRef = collection(db, 'memes');
      
      const q = query(
        memesRef,
        where('createdAt', '>', twentyFourHoursAgo),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        await setDoc(rewardRef, { status: 'completed', reason: 'no_memes', awardedAt: serverTimestamp() });
        return { success: true, message: "No memes posted in the last 24 hours." };
      }

      let topMeme: any = null;
      let maxVotes = -1;

      querySnapshot.forEach((doc) => {
        const meme = { id: doc.id, ...doc.data() };
        if (meme.voteCount > maxVotes) {
          maxVotes = meme.voteCount;
          topMime = meme;
        }
      });

      if (!topMeme || maxVotes === 0) {
        await setDoc(rewardRef, { status: 'completed', reason: 'no_votes', awardedAt: serverTimestamp() });
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

       // Log the win in the 'winners' collection
      await addDoc(collection(db, 'winners'), {
        userId: topMeme.userId,
        memeId: topMeme.id,
        rewardAmount,
        voteCount: topMeme.voteCount,
        createdAt: serverTimestamp(),
      });
      
      // Mark this day's reward as processed to prevent double-awarding
      await setDoc(rewardRef, {
        status: 'completed',
        winnerId: topMeme.userId,
        memeId: topMeme.id,
        awardedAt: serverTimestamp(),
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
