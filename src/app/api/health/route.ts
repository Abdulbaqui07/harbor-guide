import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "harbor",
    commit: process.env.VERCEL_GIT_COMMIT_SHA || "unlinked",
    env: process.env.VERCEL_ENV || "development",
    time: new Date().toISOString(),
  });
}
