import { NextResponse } from "next/server";
import { z } from "zod";
import { getProgress, saveProgress } from "@/lib/tutorials";

export const dynamic = "force-dynamic";

const schema = z.object({
  userKey: z.string().min(1).max(64),
  slug: z.string().min(1).max(64),
  currentStep: z.number().int().min(0).max(200),
  completed: z.boolean(),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const saved = await saveProgress(parsed.data);
  if (!saved) {
    return NextResponse.json({ error: "Tutorial not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userKey = url.searchParams.get("userKey");
  const slug = url.searchParams.get("slug");
  if (!userKey || !slug) {
    return NextResponse.json({ error: "Missing userKey or slug" }, { status: 400 });
  }
  return NextResponse.json((await getProgress(userKey, slug)) ?? {});
}
