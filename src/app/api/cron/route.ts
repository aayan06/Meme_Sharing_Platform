// src/app/api/cron/route.ts
import { rewardDailyWinner } from "@/ai/flows/reward-daily-winner";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  const authHeader = headers().get("authorization");
  const requestSecret = authHeader?.replace("Bearer ", "");

  const secret = process.env.CRON_SECRET;

  if (!secret) {
    // This will cause a 500 error in the Cloud Scheduler logs if the secret isn't set on the server.
    console.error("CRON_SECRET is not set in the environment variables.");
    return new NextResponse("Internal Server Error: Secret not configured", { status: 500 });
  }

  if (requestSecret !== secret) {
    // This will cause a 401 Unauthorized error if the scheduler sends the wrong secret.
    console.warn(`Unauthorized cron attempt.`);
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    console.log("Cron job authorized. Running rewardDailyWinner flow...");
    const result = await rewardDailyWinner();
    console.log("Reward flow finished:", result);
    return NextResponse.json({ ok: true, result });
  } catch (err: any) {
    console.error("Error running rewardDailyWinner from API route:", err);
    return new NextResponse("Internal Server Error executing the reward flow.", { status: 500 });
  }
}