/**
 * Runs a tutorial against the real application and reports where it breaks.
 *
 * A selector allowlist proves a step names something that exists somewhere.
 * Only executing the tutorial proves the step can actually be reached and
 * satisfied in order. Usage:  node scripts/eval-tutorial.mjs <slug>
 */
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3210";
const SLUG = process.argv[2] ?? "first-gate-release";
const inventory = JSON.parse(readFileSync("src/lib/ai/ui-inventory.json", "utf8"));

const SAMPLE = {
  "request-haulier": "Al Noor Transport LLC",
  "request-date": "2026-08-28",
  "login-email": "operator@harbor.dev",
  "login-password": "harbor123",
  "search-input": "MSKU7482913",
};

const tutorial = await fetch(`${BASE}/api/tutorials/${SLUG}`).then((r) => {
  if (!r.ok) throw new Error(`No tutorial "${SLUG}" (${r.status})`);
  return r.json();
});

console.log(`\nEvaluating "${tutorial.title}" (${SLUG}) — ${tutorial.steps.length} steps`);
console.log(`Source: ${tutorial.source}   against ${BASE}\n`);

// ---- Static pass: does every step name something real? ---------------------
const staticIssues = [];
for (const [i, s] of tutorial.steps.entries()) {
  const page = inventory[s.page];
  if (!page) staticIssues.push(`step ${i + 1}: page "${s.page}" does not exist`);
  else if (!page.elements.some((e) => e.id === s.targetId))
    staticIssues.push(`step ${i + 1}: "${s.targetId}" is not on ${s.page}`);
}
console.log(`Static  : ${staticIssues.length === 0 ? "all steps reference real elements" : `${staticIssues.length} problem(s)`}`);
for (const issue of staticIssues) console.log(`          x ${issue}`);

// ---- Dynamic pass: can a user actually complete it? ------------------------
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 950 } });
const sel = (id) => `[data-tutorial-id="${id}"]`;
const tip = '[role="dialog"]';

let reached = 0;
let stalledAt = null;
let stallReason = "";

try {
  await page.goto(`${BASE}/login?tutorial=${SLUG}`, { waitUntil: "domcontentloaded" });

  for (let i = 0; i < tutorial.steps.length; i++) {
    const step = tutorial.steps[i];

    const shown = await page
      .waitForSelector(`${tip}:has-text("Step ${i + 1} of")`, { timeout: 12000 })
      .then(() => true)
      .catch(() => false);

    if (!shown) {
      stalledAt = i + 1;
      const actual = await page.textContent(tip).catch(() => null);
      stallReason = actual
        ? `engine is showing "${actual.match(/Step \d+ of \d+/)?.[0] ?? "something else"}"`
        : "no tutorial tooltip on screen";
      break;
    }

    const visible = await page.isVisible(sel(step.targetId)).catch(() => false);
    if (!visible) {
      stalledAt = i + 1;
      stallReason = `target "${step.targetId}" is not visible on this page`;
      break;
    }

    try {
      if (step.action === "click") {
        await page.click(sel(step.targetId), { timeout: 8000 });
      } else if (step.action === "observe") {
        await page.click(`${tip} >> text=Got it`, { timeout: 8000 });
      } else {
        const value = step.expectedValue ?? SAMPLE[step.targetId] ?? "Sample value";
        if (step.action === "select") {
          // Fall back to a real option from the DOM rather than a guess, so a
          // failure here means the step is wrong, not the harness.
          const chosen = step.expectedValue
            ? value
            : await page.$eval(sel(step.targetId), (el) => {
                const opts = [...el.querySelectorAll("option")].map((o) => o.value);
                return opts[opts.length - 1];
              });
          await page.selectOption(sel(step.targetId), chosen, { timeout: 8000 });
        } else {
          await page.fill(sel(step.targetId), value, { timeout: 8000 });
        }
        const ok = await page
          .waitForSelector(`${tip} >> text=Continue`, { timeout: 5000 })
          .then(async (el) => !(await el.isDisabled()))
          .catch(() => false);
        if (!ok) {
          stalledAt = i + 1;
          stallReason = `Continue stayed disabled after entering "${value}"`;
          break;
        }
        await page.click(`${tip} >> text=Continue`);
      }
    } catch (err) {
      stalledAt = i + 1;
      stallReason = err.message.split("\n")[0];
      break;
    }

    reached = i + 1;
    await page.waitForTimeout(350);
  }

  if (!stalledAt) {
    const done = await page
      .waitForSelector("text=Tutorial complete", { timeout: 10000 })
      .then(() => true)
      .catch(() => false);
    if (!done) {
      stalledAt = tutorial.steps.length;
      stallReason = "never reached the completion card";
    }
  }
} finally {
  await browser.close();
}

console.log(
  `Dynamic : completed ${reached}/${tutorial.steps.length} steps` +
    (stalledAt ? `\n          x stalled at step ${stalledAt} — ${stallReason}` : ""),
);

const passed = staticIssues.length === 0 && !stalledAt;
console.log(`\n${passed ? "PASS" : "FAIL"} — ${SLUG}\n`);
process.exit(passed ? 0 : 1);
