import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3210";
const SLUG = "first-gate-release";

const SAMPLE = {
  "request-haulier": "Al Noor Transport LLC",
  "request-date": "2026-08-28",
};

const results = [];
function check(name, ok, detail = "") {
  results.push(ok);
  console.log(`${ok ? "  PASS" : "  FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

const steps = await fetch(`${BASE}/api/tutorials/${SLUG}`)
  .then((r) => r.json())
  .then((t) => t.steps);

console.log(`\nDriving "${SLUG}" — ${steps.length} steps against ${BASE}\n`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const sel = (id) => `[data-tutorial-id="${id}"]`;
const tip = '[role="dialog"]';

try {
  await page.goto(`${BASE}/login?tutorial=${SLUG}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(tip, { timeout: 15000 });

  // The spotlight must actually dim the page.
  const dimmed = await page.$eval(
    ".pointer-events-none.fixed",
    (el) => getComputedStyle(el).boxShadow.includes("9999px"),
  ).catch(() => false);
  check("spotlight dims the page around the target", dimmed);

  // Wrong clicks must not advance a click step.
  await page.click("body", { position: { x: 5, y: 5 } });
  const stillOne = (await page.textContent(tip))?.includes("Step 1 of");
  check("clicking the wrong place does not advance", stillOne ?? false);

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    await page.waitForSelector(tip, { timeout: 15000 });

    const header = await page.textContent(tip);
    if (!header?.includes(`Step ${i + 1} of ${steps.length}`)) {
      check(`step ${i + 1} (${step.targetId}) is showing`, false, header?.slice(0, 40));
      break;
    }

    // The highlighted element must be the one the step names.
    const targetVisible = await page.isVisible(sel(step.targetId));
    if (!targetVisible) {
      check(`step ${i + 1} target ${step.targetId} is on the page`, false);
      break;
    }

    if (step.action === "click") {
      await page.click(sel(step.targetId));
    } else if (step.action === "observe") {
      await page.click(`${tip} >> text=Got it`);
    } else {
      // Validation gate: Continue must start disabled.
      const gated = await page.isDisabled(`${tip} >> text=Continue`).catch(() => false);
      if (i === 3) check("Continue is disabled until the field is valid", gated);

      const value = step.expectedValue ?? SAMPLE[step.targetId] ?? "Test value";
      if (step.action === "select") {
        await page.selectOption(sel(step.targetId), value);
      } else {
        await page.fill(sel(step.targetId), value);
      }
      await page.waitForSelector(`${tip} >> text=Continue`, { timeout: 5000 });
      await page.click(`${tip} >> text=Continue`);
    }

    await page.waitForTimeout(450);
  }

  const done = await page.textContent("body");
  check("tutorial reaches the completion card", done?.includes("Tutorial complete") ?? false);
  check(
    "completion reports every step",
    done?.includes(`${steps.length} of ${steps.length} steps`) ?? false,
  );

  // Progress must have been written server-side.
  const visitor = await page.evaluate(() => localStorage.getItem("harbor_visitor"));
  const progress = await fetch(
    `${BASE}/api/tutorials/progress?userKey=${visitor}&slug=${SLUG}`,
  ).then((r) => r.json());
  check(
    "progress persisted to Postgres",
    progress.current_step === steps.length && !!progress.completed_at,
    `current_step=${progress.current_step} completed=${!!progress.completed_at}`,
  );
} catch (err) {
  check("tutorial run completed without throwing", false, err.message.split("\n")[0]);
} finally {
  await browser.close();
}

const passed = results.filter(Boolean).length;
console.log(`\n${passed}/${results.length} checks passed\n`);
process.exit(passed === results.length ? 0 : 1);
