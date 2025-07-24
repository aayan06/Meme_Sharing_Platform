
'use server';

/**
 * @fileOverview A flow to handle voting on a meme, ensuring a user can only vote once.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getFirestore, doc, runTransaction, DocumentReference } from "firebase/firestore";
import { db } from '@/lib/firebase';

const VoteOnMemeInputSchema = z.object({
  memeId: z.string().describe('The ID of the meme to vote on.'),
  userId: z.string().describe('The ID of the user casting the vote.'),
});
export type VoteOnMemeInput = z.infer<typeof VoteOnMemeInputSchema>;

const VoteOnMemeOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  newVoteCount: z.number().optional(),
});
export type VoteOnMemeOutput = z.infer<typeof VoteOnMemeOutputSchema>;

export async function voteOnMeme(input: VoteOnMemeInput): Promise<VoteOnMemeOutput> {
  return voteOnMemeFlow(input);
}

const voteOnMemeFlow = ai.defineFlow(
  {
    name: 'voteOnMemeFlow',
    inputSchema: VoteOnMemeInputSchema,
    outputSchema: VoteOnMemeOutputSchema,
  },
  async ({ memeId, userId }) => {
    try {
      const memeRef = doc(db, 'memes', memeId);

      const newVoteCount = await runTransaction(db, async (transaction) => {
        const memeDoc = await transaction.get(memeRef);

        if (!memeDoc.exists()) {
          throw new Error("Meme does not exist.");
        }

        const data = memeDoc.data();
        const voters = data.voters || [];

        if (voters.includes(userId)) {
          // User has already voted, do not throw error but return a specific message
          return null; 
        }

        const newVoters = [...voters, userId];
        const newVoteCount = (data.voteCount || 0) + 1;

        transaction.update(memeRef, {
          voteCount: newVoteCount,
          voters: newVoters,
        });

        return newVoteCount;
      });

      if (newVoteCount === null) {
        return {
          success: false,
          message: "You have already voted on this meme.",
        };
      }

      return {
        success: true,
        message: "Vote counted successfully.",
        newVoteCount,
      };

    } catch (error: any) {
      console.error("Vote transaction failed: ", error);
      return {
        success: false,
        message: error.message || "An unexpected error occurred while voting.",
      };
    }
  }
);
