import { ChatAnthropic } from "@langchain/anthropic";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import inventoryJson from "./ui-inventory.json";
import {
  generatedTutorialSchema,
  validateAgainstInventory,
  type GeneratedStep,
  type Inventory,
  type ValidationIssue,
} from "./schema";

export const inventory = inventoryJson as Inventory;

const APP_CONTEXT = `
Harbor Terminal Portal is used by hauliers and freight forwarders to manage
containers sitting in a shipping terminal's yard.

Domain facts that matter to a new user:
- A container has a status. Only "Gate Out Ready" containers can be collected.
- Free time is the number of days before storage charges (demurrage) start.
- A hold (Customs, Payment, Documentation) blocks release until it is cleared.
- A gate release authorises a named haulier to collect the container.
- Container numbers look like MSKU7482913. MSKU7482913 is a clean example with
  no holds; HLXU3388216 has two active holds.
`.trim();

const SYSTEM = `
You write interactive onboarding tutorials for a web application. The tutorial
is rendered by an engine that highlights one element at a time and waits for
the user to act.

Hard rules:
- You may only reference pages and element IDs that appear in the inventory.
  Never invent an ID, never guess a CSS selector, never output code.
- Steps must be in the order a user would really perform them, and the pages
  must follow a reachable path through the app.
- A "click" step must target something clickable. An "input" or "select" step
  must target a field. Use "observe" to explain something without requiring an
  action.
- A "select" step MUST set expectedValue to one of the option labels listed for
  that element, copied exactly. Never leave it null and never invent a label.
- Elements marked "conditional" are only rendered in certain states. Do not
  reference one unless earlier steps have actually navigated the user into the
  state where it appears. Describing something the user cannot see on screen is
  a failure, even if the wording is accurate.
- Write for someone who has never seen the app and does not know the jargon.
  Explain why a step matters, not just what to press.
- Keep each message under two sentences.
- Use plain ASCII punctuation only. Hyphens, never em dashes or en dashes.
  Straight quotes, never curly ones. Three dots, never a single ellipsis
  character.
`.trim();

const prompt = ChatPromptTemplate.fromMessages([
  ["system", SYSTEM],
  [
    "human",
    `Application context:
{context}

Element inventory (the only pages and IDs you may reference):
{inventory}

Write a tutorial that achieves this goal: {goal}`,
  ],
]);

export type GenerationResult = {
  title: string;
  description: string;
  steps: GeneratedStep[];
  issues: ValidationIssue[];
  rawStepCount: number;
  usage: { input: number; output: number } | null;
};

export async function generateTutorial(goal: string): Promise<GenerationResult> {
  const model = new ChatAnthropic({
    model: "claude-opus-5",
    maxTokens: 8000,
  });

  const chain = prompt.pipe(
    model.withStructuredOutput(generatedTutorialSchema, {
      name: "tutorial",
      includeRaw: true,
    }),
  );

  const result = await chain.invoke({
    context: APP_CONTEXT,
    goal,
    // Only ids and labels - the model never needs the URLs or markup.
    inventory: JSON.stringify(
      Object.fromEntries(
        Object.entries(inventory).map(([page, data]) => [
          page,
          data.elements.map((e) => ({
            id: e.id,
            tag: e.tag,
            label: e.text,
            ...(e.conditional ? { conditional: true } : {}),
            ...(e.options ? { options: e.options } : {}),
          })),
        ]),
      ),
      null,
      1,
    ),
  });

  const parsed = result.parsed;
  const { steps, issues } = validateAgainstInventory(parsed, inventory);

  // usage_metadata is present at runtime but typed only on AIMessage, not the
  // BaseMessage that withStructuredOutput declares.
  const meta = (
    result.raw as unknown as {
      usage_metadata?: { input_tokens?: number; output_tokens?: number };
    }
  )?.usage_metadata;

  return {
    title: parsed.title,
    description: parsed.description,
    steps,
    issues,
    rawStepCount: parsed.steps.length,
    usage: meta
      ? { input: meta.input_tokens ?? 0, output: meta.output_tokens ?? 0 }
      : null,
  };
}
