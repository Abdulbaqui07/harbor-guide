import { NextResponse } from "next/server";
import { z } from "zod";
import { askAssistant } from "@/lib/ai/assistant";
import { getSession } from "@/lib/session";
import { listTutorials } from "@/lib/tutorials";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const schema = z.object({
  question: z.string().min(3).max(300),
  page: z.string().max(48).nullable(),
});

/** Per-instance guard against a runaway loop. Not a shared limiter. */
const hits: number[] = [];
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;

function rateLimited() {
  const now = Date.now();
  while (hits.length && now - hits[0] > WINDOW_MS) hits.shift();
  if (hits.length >= MAX_PER_WINDOW) return true;
  hits.push(now);
  return false;
}

export async function POST(req: Request) {
  // Every answer costs money, so it needs the same session as the portal.
  if (!(await getSession())) {
    return NextResponse.json({ error: "Sign in to ask." }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "The assistant is not configured on this deployment." },
      { status: 503 },
    );
  }
  if (rateLimited()) {
    return NextResponse.json(
      { error: "Too many questions at once. Give it a moment." },
      { status: 429 },
    );
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const tutorials = (await listTutorials()).map((t) => ({
      slug: t.slug,
      title: t.title,
      description: t.description,
    }));

    const result = await askAssistant({ ...parsed.data, tutorials });
    return NextResponse.json(result);
  } catch (err) {
    console.error("assistant failed", err);
    return NextResponse.json({ error: "Could not answer just now." }, { status: 500 });
  }
}
