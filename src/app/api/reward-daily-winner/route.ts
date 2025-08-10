// src/app/api/reward-daily-winner/route.ts
import { NextResponse } from "next/server";
import { rewardDailyWinner } from "@/ai/flows/reward-daily-winner";

export const dynamic = 'force-dynamic';

// This endpoint is designed to be called by a secure scheduler (like Google Cloud Scheduler).
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  
  // The 'authorization' header should be in the format: 'Bearer your-secret-goes-here'
  const authHeader = req.headers.get("authorization");
  const requestSecret = authHeader?.replace("Bearer ", "");

  // 1. Check if the CRON_SECRET is configured on the server.
  if (!secret) {
    console.error("CRON_SECRET is not set in the environment variables.");
    return new NextResponse("Internal Server Error: Secret not configured", { status: 500 });
  }

  // 2. Check if the incoming request's secret matches the one on the server.
  if (requestSecret !== secret) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const result = await rewardDailyWinner();
    return NextResponse.json({ ok: true, result });
  } catch (err: any) {
    console.error("Error in cron job:", err);
    return new NextResponse(err.message || "Internal Server Error", { status: 500 });
  }
}
