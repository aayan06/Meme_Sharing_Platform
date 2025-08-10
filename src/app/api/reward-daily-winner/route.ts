// src/app/api/reward-daily-winner/route.ts
import { NextResponse } from "next/server";
import { rewardDailyWinner } from "@/ai/flows/reward-daily-winner";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const requestSecret = req.headers.get("authorization")?.replace("Bearer ", "");

  if (!secret || requestSecret !== secret) {
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
