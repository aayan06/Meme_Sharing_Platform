// src/app/actions.ts
'use server';

import { rewardDailyWinner } from "@/ai/flows/reward-daily-winner";
import { headers } from "next/headers";

export async function runDailyRewardWinner() {
  // This is a server action, which has extra security features.
  // We will verify the request is coming from the Google Cloud Scheduler.
  
  const secret = process.env.CRON_SECRET;
  
  if (!secret) {
    console.error("CRON_SECRET is not set in the environment variables.");
    // Throw an error to signal failure to the scheduler.
    throw new Error("Unauthorized: Server secret not configured.");
  }
  
  const authHeader = headers().get("authorization");
  const requestSecret = authHeader?.replace("Bearer ", "");

  if (requestSecret !== secret) {
     console.warn(`Unauthorized cron attempt. Provided: ${requestSecret}, Expected: ${secret.substring(0, 3)}...`);
     throw new Error("Unauthorized: Invalid secret.");
  }

  try {
    console.log("Cron job authorized. Running rewardDailyWinner flow...");
    const result = await rewardDailyWinner();
    console.log("Reward flow finished:", result);
    return result;
  } catch (err: any) {
    console.error("Error running rewardDailyWinner from server action:", err);
    throw new Error("Internal Server Error executing the reward flow.");
  }
}
