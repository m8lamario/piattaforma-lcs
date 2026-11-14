import { NextRequest, NextResponse } from "next/server";
import { runMedicalDeadlineReminders } from "@/features/documents/data/deadline";

function authorized(request: NextRequest) {
  const expected = process.env.CRON_SECRET ?? process.env.JOB_SECRET;
  if (!expected) return false;
  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${expected}`;
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const result = await runMedicalDeadlineReminders();
  return NextResponse.json(result);
}

export async function GET(request: NextRequest) {
  return POST(request);
}
