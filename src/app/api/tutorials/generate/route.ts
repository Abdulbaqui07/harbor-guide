import { NextResponse } from "next/server";
import { z } from "zod";
import { generateTutorial } from "@/lib/ai/generate";
import { saveGeneratedTutorial } from "@/lib/tutorials";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const schema = z.object({
  goal: z.string().min(10).max(400),
  slug: z
    .string()
    .regex(/^[a-z0-9-]{3,48}$/, "Slug must be lowercase letters, digits and dashes")
    .optional(),
  save: z.boolean().default(false),
});

/**
 * Generation is slow and costs money, so it is rate limited. This counter is
 * per serverless instance, which is enough to stop an accidental loop but is
 * not a substitute for a shared limiter (Redis) in production.
 */
const hits: number[] = [];
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

function rateLimited() {
  const now = Date.now();
  while (hits.length && now - hits[0] > WINDOW_MS) hits.shift();
  if (hits.length >= MAX_PER_WINDOW) return true;
  hits.push(now);
  return false;
}

export async function POST(req: Request) {
  // Every call spends money, so require a signed-in user. Without this the
  // endpoint is a public spend button on a public URL.
  if (!(await getSession())) {
    return NextResponse.json({ error: "Sign in to generate." }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Generation is not configured on this deployment." },
      { status: 503 },
    );
  }

  if (rateLimited()) {
    return NextResponse.json(
      { error: "Too many generations. Wait a minute and try again." },
      { status: 429 },
    );
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const started = Date.now();
  try {
    const result = await generateTutorial(parsed.data.goal);

    if (result.steps.length < 3) {
      return NextResponse.json(
        {
          error:
            "The model produced too few usable steps after validation. Try a more specific goal.",
          issues: result.issues,
        },
        { status: 422 },
      );
    }

    let saved = null;
    if (parsed.data.save) {
      saved = await saveGeneratedTutorial({
        slug: parsed.data.slug ?? `ai-${Date.now().toString(36)}`,
        title: result.title,
        description: result.description,
        steps: result.steps,
      });
    }

    return NextResponse.json({
      ...result,
      saved,
      elapsedMs: Date.now() - started,
    });
  } catch (err) {
    console.error("tutorial generation failed", err);
    return NextResponse.json(
      { error: "Generation failed. Check the server logs." },
      { status: 500 },
    );
  }
}
