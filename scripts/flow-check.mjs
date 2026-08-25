import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3210";
const results = [];
const inventory = {};

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "  PASS" : "  FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function snapshot(page, label) {
  const ids = await page.$$eval("[data-tutorial-id]", (els) =>
    els.map((el) => ({
      id: el.getAttribute("data-tutorial-id"),
      tag: el.tagName.toLowerCase(),
      text: (el.textContent ?? "").trim().slice(0, 60),
    })),
  );

  // Key the inventory by the page's REAL data-tutorial-page value, not by the
  // label this script happens to use. A made-up key looks valid to the
  // allowlist but can never match at runtime, so a generated step targeting it
  // would silently stall the tutorial.
  const key = await page
    .$eval("[data-tutorial-page]", (el) => el.getAttribute("data-tutorial-page"))
    .catch(() => null);

  if (key) {
    // The same page renders different controls depending on state (a held
    // container hides Create request and shows Blocked by holds instead), so
    // merge across visits and count how often each element actually appeared.
    const entry = (inventory[key] ??= { url: page.url(), visits: 0, elements: [] });
    entry.url = page.url();
    entry.visits += 1;
    for (const el of ids) {
      const found = entry.elements.find((e) => e.id === el.id);
      if (found) found.seen += 1;
      else entry.elements.push({ ...el, seen: 1 });
    }
  }

  return ids;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

try {
  console.log(`\nFlow check against ${BASE}\n`);

  // 1. Guarded route bounces to login
  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
  check("guarded /dashboard redirects to /login", page.url().endsWith("/login"));
  await snapshot(page, "login");

  // 2. Bad credentials are rejected
  await page.fill('[data-tutorial-id="login-password"]', "wrong-password");
  await page.click('[data-tutorial-id="login-submit"]');
  // Wait on the text, not just the node: the alert element attaches a tick
  // before React paints its content.
  const alerted = await page
    .waitForSelector('[role="alert"]:has-text("don\'t match")', { timeout: 10000 })
    .then(() => true)
    .catch(() => false);
  check("wrong password shows an error", alerted);

  // 3. Real credentials land on the dashboard
  await page.fill('[data-tutorial-id="login-email"]', "operator@harbor.dev");
  await page.fill('[data-tutorial-id="login-password"]', "harbor123");
  await page.click('[data-tutorial-id="login-submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  check("valid login reaches /dashboard", true);
  const dash = await snapshot(page, "dashboard");
  check("dashboard renders KPI tiles", dash.some((e) => e.id === "kpi-ready"));

  // 4. Search
  await page.click('[data-tutorial-id="nav-search"]');
  await page.waitForURL("**/search", { timeout: 15000 });
  await page.fill('[data-tutorial-id="search-input"]', "MSKU7482913");
  await page.click('[data-tutorial-id="search-submit"]');
  await page.waitForSelector('[data-tutorial-id="result-MSKU7482913"]', {
    timeout: 15000,
  });
  const hits = await page.$$('[data-tutorial-id^="result-"]');
  check("search narrows to one result", hits.length === 1, `${hits.length} rows`);
  await snapshot(page, "search");

  // 5. Detail page
  await page.click('[data-tutorial-id="result-MSKU7482913"]');
  await page.waitForURL("**/containers/MSKU7482913", { timeout: 15000 });
  const detail = await snapshot(page, "container-detail");
  check(
    "clean container offers a create-request CTA",
    detail.some((e) => e.id === "create-request"),
  );

  // 6. Request form
  await page.click('[data-tutorial-id="create-request"]');
  await page.waitForURL("**/requests/new**", { timeout: 15000 });
  await snapshot(page, "new-request");
  await page.selectOption('[data-tutorial-id="request-type"]', "Gate Release");
  await page.fill('[data-tutorial-id="request-haulier"]', "Al Noor Transport LLC");
  await page.fill('[data-tutorial-id="request-date"]', "2026-08-28");
  await page.click('[data-tutorial-id="request-submit"]');

  // 7. Confirmation
  await page.waitForURL(/\/requests\/REQ-/, { timeout: 20000 });
  const confirm = await snapshot(page, "request-confirmation");
  check(
    "submitting produces a confirmation with a reference",
    confirm.some((e) => e.id === "request-confirmation"),
    page.url().split("/").pop(),
  );

  // Guards against date columns being rendered from a JS Date ("Fri Aug 28")
  // instead of the ISO string Postgres formats for us.
  const confirmText = await page.textContent('[data-tutorial-id="request-confirmation"]');
  check(
    "collection date renders as an ISO date",
    confirmText?.includes("2026-08-28") ?? false,
    confirmText?.match(/\d{4}-\d{2}-\d{2}|[A-Z][a-z]{2} [A-Z][a-z]{2} \d+/)?.[0],
  );

  // 8. It persists on the requests list
  await page.click('[data-tutorial-id="nav-requests"]');
  await page.waitForURL("**/requests", { timeout: 15000 });
  const rows = await page.$$eval("li a", (els) => els.length);
  check("new request appears in the requests list", rows >= 1, `${rows} rows`);

  // 9. Held container blocks the CTA
  await page.goto(`${BASE}/containers/HLXU3388216`, { waitUntil: "domcontentloaded" });
  const held = await snapshot(page, "container-held");
  check(
    "held container blocks the request CTA",
    held.some((e) => e.id === "request-blocked") &&
      !held.some((e) => e.id === "create-request"),
  );
} catch (err) {
  check("flow completed without throwing", false, err.message.split("\n")[0]);
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(
  `\n${results.length - failed.length}/${results.length} checks passed\n`,
);

const total = Object.values(inventory).reduce(
  (n, p) => n + p.elements.length,
  0,
);
console.log(`Tutorial-target inventory: ${total} elements across ${Object.keys(inventory).length} pages`);
for (const [label, p] of Object.entries(inventory)) {
  console.log(`  ${label.padEnd(22)} ${p.elements.map((e) => e.id).join(", ")}`);
}

// An element that did not appear on every visit is state-dependent. Generators
// must not point at it unless the flow has actually reached that state.
for (const entry of Object.values(inventory)) {
  for (const el of entry.elements) {
    el.conditional = el.seen < entry.visits;
    delete el.seen;
  }
  delete entry.visits;
}

const { writeFileSync } = await import("node:fs");
writeFileSync("src/lib/ai/ui-inventory.json", JSON.stringify(inventory, null, 2));
console.log("\nWrote src/lib/ai/ui-inventory.json");

process.exit(failed.length ? 1 : 0);
