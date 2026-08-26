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
  console.log(`${ok ? "  PASS" : "  FAIL"}  ${name}${detail ? ` - ${detail}` : ""}`);
}

const steps = await fetch(`${BASE}/api/tutorials/${SLUG}`)
  .then((r) => r.json())
  .then((t) => t.steps);

console.log(`\nDriving "${SLUG}" - ${steps.length} steps against ${BASE}\n`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const sel = (id) => `[data-tutorial-id="${id}"]`;
const tip = '[role="dialog"]';

try {
  // A signed-in user following the deep link must not lose the tutorial.
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill(sel("login-email"), "operator@harbor.dev");
  await page.fill(sel("login-password"), "harbor123");
  await page.click(sel("login-submit"));
  await page.waitForURL("**/dashboard", { timeout: 15000 });

  await page.goto(`${BASE}/login?tutorial=${SLUG}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(tip, { timeout: 15000 });
  check(
    "deep link survives the signed-in bounce and skips to this page's step",
    (await page.textContent(tip))?.includes("Step 2 of") ?? false,
    (await page.textContent(tip))?.match(/Step \d+ of \d+/)?.[0],
  );

  // The header button starts the tutorial from wherever the user already is.
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE}/search`, { waitUntil: "domcontentloaded" });
  await page.click("text=Show me how");
  await page.waitForSelector(tip, { timeout: 15000 });
  check(
    "header button starts at the current page's step",
    (await page.textContent(tip))?.includes("Step 4 of") ?? false,
    (await page.textContent(tip))?.match(/Step \d+ of \d+/)?.[0],
  );

  // Regression: a click step that navigates must have saved progress BEFORE
  // the engine unmounts. Forcing a full page load right after the click is the
  // worst case - if the save happened inside a React updater it is lost, and
  // the tutorial resumes on the previous page's step.
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
  await page.click("text=Show me how");
  await page.waitForSelector(tip, { timeout: 15000 });
  await page.click(`${tip} >> text=Got it`);          // step 2 -> 3
  await page.waitForTimeout(400);
  await page.click(sel("nav-search"));                 // step 3 -> 4, navigates
  await page.waitForURL("**/search", { timeout: 15000 });
  await page.goto(`${BASE}/search`, { waitUntil: "domcontentloaded" }); // hard load
  await page.waitForSelector(tip, { timeout: 15000 });
  const resumed = await page.textContent(tip);
  check(
    "progress survives a click step that navigates",
    resumed?.includes("Step 4 of") ?? false,
    resumed?.match(/Step \d+ of \d+/)?.[0],
  );

  // Simulate a lost advance directly: saved step is 3 (a dashboard click step)
  // but we're on /search, the page step 4 belongs to. The engine should
  // recover to step 4 rather than stranding the user on an off-track card.
  await page.goto(`${BASE}/search`, { waitUntil: "domcontentloaded" });
  // Let the engine finish booting first, or it overwrites the value we plant.
  await page.waitForSelector(tip, { timeout: 15000 });
  await page.evaluate(() =>
    localStorage.setItem(
      "harbor_tutorial",
      JSON.stringify({ slug: "first-gate-release", index: 2 }),
    ),
  );
  await page.goto(`${BASE}/search`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(tip, { timeout: 15000 });
  const healed = await page.textContent(tip);
  check(
    "recovers when a click step's advance was lost",
    healed?.includes("Step 4 of") ?? false,
    healed?.match(/Step \d+ of \d+/)?.[0],
  );

  // The path a real user takes from the discovery page: an in-app link, which
  // is a client-side navigation rather than a page load. The engine lives in
  // the root layout and does not remount, so it has to react to the parameter
  // arriving rather than only reading it once on mount.
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear()).catch(() => {});
  await page.goto(`${BASE}/guide/search`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2600);
  await page.click("text=Open the portal and start the walkthrough");
  await page.waitForURL("**/login**", { timeout: 20000 });
  const viaLink = await page
    .waitForSelector(`${tip}:has-text("Step 1 of")`, { timeout: 15000 })
    .then(() => true)
    .catch(() => false);
  check("an in-app link into the tutorial starts it", viaLink);

  // Back to a clean run from the top.
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE}/api/auth-reset`, { waitUntil: "domcontentloaded" }).catch(() => {});
  await page.context().clearCookies();
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
  // Progress is written fire-and-forget, so poll instead of reading once.
  let progress = {};
  for (let i = 0; i < 20; i++) {
    progress = await fetch(
      `${BASE}/api/tutorials/progress?userKey=${visitor}&slug=${SLUG}`,
    ).then((r) => r.json());
    if (progress.current_step === steps.length && progress.completed_at) break;
    await new Promise((r) => setTimeout(r, 500));
  }
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
