import { NextRequest, NextResponse } from "next/server";
import { runMedicalRetention } from "@/features/documents/data/retention";

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
  const result = await runMedicalRetention();
  return NextResponse.json(result);
}

export async function GET(request: NextRequest) {
  return POST(request);
}
