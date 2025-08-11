// src/app/cron/route.ts
import { runDailyRewardWinner } from "@/app/actions";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// This is the new endpoint for the Cloud Scheduler to call.
// It securely invokes the server action.
export async function GET() {
  try {
    const result = await runDailyRewardWinner();
    return NextResponse.json({ ok: true, result });
  } catch (err: any) {
    // The server action will throw an error on auth failure or internal errors.
    // We catch it here and return an appropriate status code.
    const status = err.message.includes("Unauthorized") ? 401 : 500;
    return new NextResponse(err.message || "Internal Server Error", { status });
  }
}
