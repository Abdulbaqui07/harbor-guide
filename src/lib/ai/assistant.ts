import { ChatAnthropic } from "@langchain/anthropic";
import { z } from "zod";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import inventoryJson from "./ui-inventory.json";
import type { Inventory } from "./schema";

const inventory = inventoryJson as Inventory;

const DOMAIN = `
Harbor Terminal Portal is used by hauliers and freight forwarders to manage
containers sitting in a shipping terminal's yard.

- Only containers with status "Gate Out Ready" can be collected.
- Free time is the days remaining before storage charges (demurrage) begin.
- A hold (Customs, Payment, Documentation) blocks release until it is cleared.
  A held container shows "Blocked by holds" instead of a Create request button.
- A gate release authorises a named haulier to collect a container.
- Container numbers look like MSKU7482913. MSKU7482913 is clear of holds;
  HLXU3388216 has two active holds.
`.trim();

export const answerSchema = z.object({
  answer: z
    .string()
    .max(600)
    .describe("A direct answer in at most three sentences. Plain language, no jargon. ASCII punctuation only: hyphens, never em dashes."),
  targetId: z
    .string()
    .nullable()
    .describe("If one control on the CURRENT page answers this, its data-tutorial-id, so the app can highlight it. Otherwise null."),
  tutorialSlug: z
    .string()
    .nullable()
    .describe("If a listed tutorial teaches this, its slug, so the app can offer to run it. Otherwise null."),
});

export type Answer = z.infer<typeof answerSchema>;

export type AssistantResult = Answer & {
  usage: { input: number; output: number } | null;
  rejected: string[];
};

export async function askAssistant(input: {
  question: string;
  page: string | null;
  tutorials: { slug: string; title: string; description: string }[];
}): Promise<AssistantResult> {
  const pageEntry = input.page ? inventory[input.page] : undefined;

  const model = new ChatAnthropic({
    model: "claude-sonnet-5",
    maxTokens: 1024,
  });

  const system = new SystemMessage({
    content: [
      {
        type: "text",
        // Stable across every question, so cache it rather than re-billing it.
        cache_control: { type: "ephemeral" },
        text: [
          "You are the in-app assistant for Harbor Terminal Portal. You help users who are",
          "looking at the application right now and do not know what to do next.",
          "",
          DOMAIN,
          "",
          "Rules:",
          "- Answer only from what you are told here. If you do not know, say so and suggest",
          "  where in the app they could look.",
          "- Never invent a control, a page, a container number or a policy.",
          "- Only set targetId to a data-tutorial-id listed for the user's current page.",
          "- Only set tutorialSlug to a slug from the tutorial list.",
          "- Be brief. Three sentences at most.",
        ].join("\n"),
      },
    ],
  });

  const human = new HumanMessage(
    [
      `The user is on the "${input.page ?? "unknown"}" screen.`,
      "",
      "Controls on that screen:",
      pageEntry
        ? JSON.stringify(
            pageEntry.elements.map((e) => ({
              id: e.id,
              label: e.text || undefined,
              options: e.options,
            })),
          )
        : "(unknown screen)",
      "",
      "Tutorials available:",
      JSON.stringify(input.tutorials),
      "",
      `Question: ${input.question}`,
    ].join("\n"),
  );

  const res = await model
    .withStructuredOutput(answerSchema, { name: "answer", includeRaw: true })
    .invoke([system, human]);

  const parsed = res.parsed;
  const rejected: string[] = [];

  // Same allowlist principle as tutorial generation: a suggestion the app
  // cannot act on is worse than no suggestion.
  let targetId = parsed.targetId;
  if (targetId && !pageEntry?.elements.some((e) => e.id === targetId)) {
    rejected.push(`targetId "${targetId}" is not on ${input.page}`);
    targetId = null;
  }

  let tutorialSlug = parsed.tutorialSlug;
  if (tutorialSlug && !input.tutorials.some((t) => t.slug === tutorialSlug)) {
    rejected.push(`tutorialSlug "${tutorialSlug}" does not exist`);
    tutorialSlug = null;
  }

  const meta = (
    res.raw as unknown as {
      usage_metadata?: { input_tokens?: number; output_tokens?: number };
    }
  )?.usage_metadata;

  return {
    answer: parsed.answer,
    targetId,
    tutorialSlug,
    rejected,
    usage: meta
      ? { input: meta.input_tokens ?? 0, output: meta.output_tokens ?? 0 }
      : null,
  };
}
