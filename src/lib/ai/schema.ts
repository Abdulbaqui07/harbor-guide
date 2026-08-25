import { z } from "zod";

export const ACTIONS = ["click", "input", "select", "observe"] as const;

/**
 * The shape the model must produce. Descriptions are part of the prompt —
 * withStructuredOutput sends them to Claude as the tool schema.
 */
export const generatedStepSchema = z.object({
  page: z
    .string()
    .describe("The data-tutorial-page value this step happens on. Must be one from the inventory."),
  targetId: z
    .string()
    .describe("The data-tutorial-id of the element to highlight. Must be one listed for that page."),
  title: z.string().max(60).describe("A short imperative heading, e.g. 'Enter the container number'."),
  message: z
    .string()
    .max(280)
    .describe("One or two sentences telling the user what to do and why it matters. Plain language, no jargon."),
  action: z
    .enum(ACTIONS)
    .describe("click = the user must click this element. input/select = they must fill it. observe = explanation only."),
  expectedValue: z
    .string()
    .nullable()
    .describe("For input/select steps where one exact value is required, that value. Otherwise null."),
});

export const generatedTutorialSchema = z.object({
  title: z.string().max(80).describe("The tutorial's name, e.g. 'Book your first gate release'."),
  description: z.string().max(200).describe("One sentence describing what the user will have achieved."),
  steps: z
    .array(generatedStepSchema)
    .min(3)
    .max(20)
    .describe("The steps in order. Each must follow naturally from the last."),
});

export type GeneratedTutorial = z.infer<typeof generatedTutorialSchema>;
export type GeneratedStep = z.infer<typeof generatedStepSchema>;

export type InventoryElement = {
  id: string;
  tag: string;
  text: string;
  /** Only rendered in certain states — e.g. Create request hides when a container has holds. */
  conditional?: boolean;
};
export type Inventory = Record<string, { url: string; elements: InventoryElement[] }>;

export type ValidationIssue = {
  index: number;
  targetId: string;
  page: string;
  reason: string;
};

/**
 * The security control from the design doc: the model may only reference
 * elements that actually exist. Anything else is dropped, never rendered.
 */
export function validateAgainstInventory(
  tutorial: GeneratedTutorial,
  inventory: Inventory,
): { steps: GeneratedStep[]; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];
  const steps: GeneratedStep[] = [];

  tutorial.steps.forEach((step, index) => {
    const page = inventory[step.page];
    if (!page) {
      issues.push({
        index,
        targetId: step.targetId,
        page: step.page,
        reason: `No page "${step.page}" in the inventory`,
      });
      return;
    }

    const element = page.elements.find((e) => e.id === step.targetId);
    if (!element) {
      issues.push({
        index,
        targetId: step.targetId,
        page: step.page,
        reason: `"${step.targetId}" does not exist on ${step.page}`,
      });
      return;
    }

    // "Pick an option" is not an instruction unless it says which option.
    if (step.action === "select" && !step.expectedValue) {
      issues.push({
        index,
        targetId: step.targetId,
        page: step.page,
        reason: `select step gives no expectedValue, so there is nothing to verify`,
      });
      return;
    }

    steps.push(step);
  });

  return { steps, issues };
}
