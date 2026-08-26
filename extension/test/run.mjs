/**
 * Exercises the content script against the markup each engine actually emits,
 * without needing the extension harness. The risky part is the matching and the
 * walk up to a result block, and that is what this covers.
 */
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
import { FIXTURES } from "./fixtures.mjs";

const script = readFileSync("extension/content.js", "utf8");
const css = readFileSync("extension/content.css", "utf8");

const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` - ${detail}` : ""}`);
};

const browser = await chromium.launch();

for (const [engine, body] of Object.entries(FIXTURES)) {
  const page = await browser.newPage();
  // Stub the extension storage API the script reads its config from.
  await page.addInitScript(() => {
    window.chrome = {
      storage: {
        sync: {
          get: (defaults, cb) => cb(defaults),
        },
      },
    };
  });
  await page.setContent(`<style>${css}</style><body>${body}</body>`);
  await page.addScriptTag({ content: script });
  await page.waitForTimeout(700);

  const state = await page.evaluate(() => ({
    hits: document.querySelectorAll(".harbor-hit").length,
    dimmed: document.querySelectorAll(".harbor-dim").length,
    badge: document.querySelectorAll(".harbor-badge").length,
    hitHasHarborLink: [...document.querySelectorAll(".harbor-hit a")].some((a) =>
      a.getAttribute("href").includes("harbor-guide.vercel.app"),
    ),
    hitHeight: document.querySelector(".harbor-hit")?.getBoundingClientRect().height ?? 0,
  }));

  if (engine === "noMatch") {
    check("no-match page highlights nothing", state.hits === 0 && state.badge === 0);
    const toast = await page.waitForSelector(".harbor-toast", { timeout: 8000 }).catch(() => null);
    check("no-match page explains itself with a toast", toast !== null);
  } else {
    check(`${engine}: highlights exactly one result`, state.hits === 1, `${state.hits} hits`);
    check(`${engine}: the highlight is the Harbor link`, state.hitHasHarborLink);
    check(`${engine}: dims the other results`, state.dimmed === 2, `${state.dimmed} dimmed`);
    check(`${engine}: adds the explanatory note`, state.badge === 1);
    check(
      `${engine}: highlighted a block, not just the link`,
      state.hitHeight > 40,
      `${Math.round(state.hitHeight)}px tall`,
    );
  }

  await page.close();
}

await browser.close();

const passed = results.filter(Boolean).length;
console.log(`\n${passed}/${results.length} checks passed\n`);
process.exit(passed === results.length ? 0 : 1);
