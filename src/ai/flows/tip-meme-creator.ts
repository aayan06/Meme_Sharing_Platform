
'use server';

/**
 * @fileOverview A flow to handle tipping a meme creator with $HAHA tokens.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { doc, runTransaction, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from '@/lib/firebase';

const TipMemeCreatorInputSchema = z.object({
  memeId: z.string().describe('The ID of the meme being tipped.'),
  fromUserId: z.string().describe('The ID of the user sending the tip.'),
  toUserId: z.string().describe('The ID of the user receiving the tip (the meme creator).'),
});
export type TipMemeCreatorInput = z.infer<typeof TipMemeCreatorInputSchema>;

const TipMemeCreatorOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type TipMemeCreatorOutput = z.infer<typeof TipMemeCreatorOutputSchema>;

export async function tipMemeCreator(input: TipMemeCreatorInput): Promise<TipMemeCreatorOutput> {
  return tipMemeCreatorFlow(input);
}

const tipMemeCreatorFlow = ai.defineFlow(
  {
    name: 'tipMemeCreatorFlow',
    inputSchema: TipMemeCreatorInputSchema,
    outputSchema: TipMemeCreatorOutputSchema,
  },
  async ({ memeId, fromUserId, toUserId }) => {

    if (fromUserId === toUserId) {
        return {
            success: false,
            message: "You cannot tip yourself.",
        };
    }

    try {
      const fromUserRef = doc(db, 'users', fromUserId);
      const toUserRef = doc(db, 'users', toUserId);

      await runTransaction(db, async (transaction) => {
        const fromUserDoc = await transaction.get(fromUserRef);
        const toUserDoc = await transaction.get(toUserRef);

        if (!fromUserDoc.exists()) {
          throw new Error("Tipper user profile not found.");
        }
        if (!toUserDoc.exists()) {
          throw new Error("Creator user profile not found.");
        }

        const fromUserData = fromUserDoc.data();
        const tipperBalance = fromUserData.hahaBalance || 0;

        if (tipperBalance < 1) {
          throw new Error("Insufficient $HAHA balance to tip.");
        }
        
        const toUserData = toUserDoc.data();
        const newTipperBalance = tipperBalance - 1;
        const newCreatorBalance = (toUserData.hahaBalance || 0) + 1;

        transaction.update(fromUserRef, { hahaBalance: newTipperBalance });
        transaction.update(toUserRef, { hahaBalance: newCreatorBalance });
      });

      // Log the tip transaction in a 'tips' collection (optional but good practice)
      await addDoc(collection(db, 'tips'), {
          fromUserId,
          toUserId,
          memeId,
          amount: 1,
          createdAt: serverTimestamp(),
      });

      return {
        success: true,
        message: `Successfully tipped 1 $HAHA to the creator!`,
      };

    } catch (error: any) {
      console.error("Tipping transaction failed: ", error);
      return {
        success: false,
        message: error.message || "An unexpected error occurred while tipping.",
      };
    }
  }
);
