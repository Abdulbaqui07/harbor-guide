/**
 * Records a narrated walkthrough of the whole product as a video.
 *
 * Covers the discovery step, sign-in, the assistant answering a question and
 * pointing at the control it means, the assistant handing off into a tutorial,
 * and a gate release completed end to end.
 *
 *   node scripts/demo/record.mjs
 *   BASE_URL=http://localhost:3210 node scripts/demo/record.mjs
 */
import { chromium } from "@playwright/test";
import { mkdirSync, readdirSync, renameSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "https://harbor-guide.vercel.app";
const OUT = process.env.OUT_DIR ?? "demo-video";
const W = 1280;
const H = 720;

mkdirSync(OUT, { recursive: true });

/** Caption bar and a visible cursor, re-injected on every page load. */
const CHROME_SCRIPT = () => {
  const install = () => {
    if (document.getElementById("demo-caption")) return;

    const cap = document.createElement("div");
    cap.id = "demo-caption";
    cap.style.cssText = [
      "position:fixed", "left:0", "right:0", "bottom:0", "z-index:2147483646",
      "padding:14px 22px", "background:rgba(8,12,18,0.92)", "color:#fff",
      "font:15px/1.45 system-ui,-apple-system,sans-serif", "letter-spacing:0.01em",
      "transform:translateY(100%)", "transition:transform 260ms ease",
      "pointer-events:none", "text-align:center",
    ].join(";");
    document.body.appendChild(cap);

    const dot = document.createElement("div");
    dot.id = "demo-cursor";
    dot.style.cssText = [
      "position:fixed", "z-index:2147483647", "width:20px", "height:20px",
      "margin:-10px 0 0 -10px", "border-radius:50%",
      "background:rgba(15,111,255,0.35)", "border:2px solid #0f6fff",
      "pointer-events:none", "transition:transform 80ms linear",
      "left:0", "top:0", "opacity:0",
    ].join(";");
    document.body.appendChild(dot);

    document.addEventListener(
      "mousemove",
      (e) => {
        dot.style.opacity = "1";
        dot.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      },
      true,
    );

    window.__say = (text) => {
      cap.textContent = text;
      cap.style.transform = text ? "translateY(0)" : "translateY(100%)";
    };
  };

  if (document.body) install();
  else document.addEventListener("DOMContentLoaded", install);
};

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: W, height: H },
  recordVideo: { dir: OUT, size: { width: W, height: H } },
  colorScheme: "light",
  deviceScaleFactor: 1,
});
await context.addInitScript(CHROME_SCRIPT);

const page = await context.newPage();
const sel = (id) => `[data-tutorial-id="${id}"]`;

async function say(text, hold = 2600) {
  await page.evaluate((t) => window.__say?.(t), text).catch(() => {});
  await page.waitForTimeout(hold);
}

/** Move the pointer visibly, then click - so the video shows intent. */
async function point(selector, steps = 22) {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`no box for ${selector}`);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps });
  await page.waitForTimeout(320);
}
async function press(selector) {
  await point(selector);
  await page.click(selector);
}

console.log(`Recording against ${BASE}\n`);

// ---- 1. Discovery -----------------------------------------------------------
await page.goto(`${BASE}/guide/search`, { waitUntil: "networkidle" });
await say("A new user starts where everyone starts: a web search.", 3200);
await page.waitForTimeout(2600); // let the highlight animation play
await say("Five results come back. Only one is the portal you sign in to.", 3600);
await page.evaluate(() => window.scrollTo({ top: 420, behavior: "smooth" }));
await say("The extension does this on real Google. This page teaches it either way.", 3400);

// ---- 2. Sign in -------------------------------------------------------------
await press("text=Open the portal and start the walkthrough");
await page.waitForURL("**/login**", { timeout: 20000 });
await page.waitForTimeout(900);
await say("It lands on the portal with the walkthrough already armed.", 2800);
await press(sel("login-submit"));
await page.waitForURL("**/dashboard**", { timeout: 25000 });
await page.waitForTimeout(1400);

// ---- 3. The tutorial ---------------------------------------------------------
await say("Step two of thirteen. The spotlight explains the tile it is on.", 3200);
await press('[role="dialog"] >> text=Got it');
await page.waitForTimeout(700);
await say("Click steps only advance on a real click of the real control.", 3000);
await press(sel("nav-search"));
await page.waitForURL("**/search**", { timeout: 20000 });
await page.waitForTimeout(1500);
await say("Continue stays disabled until the value actually matches.", 3000);
await point(sel("search-input"));
await page.fill(sel("search-input"), "MSKU7482913");
await page.waitForTimeout(1100);
await press('[role="dialog"] >> text=Continue');
await page.waitForTimeout(600);
await press(sel("search-submit"));
await page.waitForTimeout(1600);
await say("Let me exit the tutorial and ask the assistant instead.", 3000);
await press('[role="dialog"] >> text=Exit');
await page.waitForTimeout(700);

// ---- 4. The assistant -------------------------------------------------------
await page.goto(`${BASE}/containers/HLXU3388216`, { waitUntil: "networkidle" });
await page.waitForTimeout(900);
await say("This container is blocked, and a new user will not know why.", 3200);
await press("text=Ask about this screen");
await page.waitForTimeout(600);
await point('input[placeholder="What do I do here?"]');
await page.fill('input[placeholder="What do I do here?"]', "Why can't I collect this container?");
await say("Ask it in plain language.", 2000);
await press('button:has-text("Ask")');
await say("Claude answers from the controls actually on this screen.", 1200);
await page.waitForSelector("text=Show me where", { timeout: 60000 });
await page.waitForTimeout(3400);

await say("It knows which control it means - watch it point.", 2600);
await press("text=Show me where");
await page.waitForTimeout(3000);
await say("And it can hand straight over to the matching walkthrough.", 3000);

// ---- 5. Finish the job ------------------------------------------------------
await page.goto(`${BASE}/containers/MSKU7482913`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await say("A clear container offers the request instead.", 2600);
await press(sel("create-request"));
await page.waitForURL("**/requests/new**", { timeout: 20000 });
await page.waitForTimeout(1000);
await say("Book the collection.", 1800);
await point(sel("request-haulier"));
await page.fill(sel("request-haulier"), "Al Noor Transport LLC");
await page.waitForTimeout(500);
await point(sel("request-date"));
await page.fill(sel("request-date"), "2026-08-28");
await page.waitForTimeout(700);
await press(sel("request-submit"));
await page.waitForURL(/\/requests\/REQ-/, { timeout: 25000 });
await page.waitForTimeout(1200);
const ref = page.url().split("/").pop();
await say(`Submitted. Reference ${ref} - the haulier quotes this at the gate.`, 4200);
await say("", 700);

await context.close();
await browser.close();

// Give the file a name worth sending to someone.
const file = readdirSync(OUT).find((f) => f.endsWith(".webm"));
if (file) {
  const target = `${OUT}/harbor-walkthrough.webm`;
  renameSync(`${OUT}/${file}`, target);
  console.log(`\nWrote ${target}`);
}
