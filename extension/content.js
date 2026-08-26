/**
 * Finds the configured domain among real search results and highlights it.
 *
 * This is the piece a web page cannot do. Same-origin policy stops any site
 * reading or restyling a search engine's DOM, so the discovery step needs an
 * extension holding an explicit permission for these hosts and nothing more.
 */

const DEFAULTS = {
  domain: "harbor-guide.vercel.app",
  label: "Harbor Terminal Portal",
  enabled: true,
};

/** Engine-specific containers, tried in order, with a structural fallback. */
const RESULT_SELECTORS = [
  "div[data-hveid] div[data-snc]", // Google, newer
  "div.g",                          // Google, long-standing
  "div[data-hveid]",                // Google, generic
  "li.b_algo",                      // Bing
  "article[data-testid='result']",  // DuckDuckGo
  "div[data-testid='result']",
];

function settings() {
  return new Promise((resolve) => {
    try {
      chrome.storage.sync.get(DEFAULTS, (v) => resolve({ ...DEFAULTS, ...v }));
    } catch {
      resolve(DEFAULTS);
    }
  });
}

function isResultBlock(el) {
  return RESULT_SELECTORS.some((sel) => el.matches?.(sel));
}

/**
 * The OUTERMOST element that still looks like a result block.
 *
 * Google nests one result container inside another (data-snc inside
 * data-hveid), so taking the innermost match leaves the highlight with no
 * siblings to dim - the other results live a level up.
 */
function resultBlock(anchor) {
  let best = null;
  let el = anchor;
  for (let i = 0; i < 8 && el; i++) {
    if (isResultBlock(el)) best = el;
    el = el.parentElement;
  }
  if (best) return best;

  // Fallback: climb until the block is big enough to be a result, not a line.
  el = anchor;
  for (let i = 0; i < 6 && el.parentElement; i++) {
    el = el.parentElement;
    if (el.getBoundingClientRect().height > 60) return el;
  }
  return anchor;
}

/** Every outermost result block on the page, so dimming works at one level. */
function allResultBlocks() {
  const found = new Set();
  for (const sel of RESULT_SELECTORS) {
    for (const el of document.querySelectorAll(sel)) found.add(el);
  }
  const list = [...found];
  return list.filter((el) => !list.some((other) => other !== el && other.contains(el)));
}

function matches(anchor, domain) {
  try {
    const url = new URL(anchor.href);
    if (url.hostname === domain) return true;
    // Search engines often wrap the destination in a redirect parameter.
    for (const key of ["url", "u", "q", "uddg"]) {
      const inner = url.searchParams.get(key);
      if (inner && inner.includes(domain)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

function badge(label) {
  const el = document.createElement("div");
  el.className = "harbor-badge";
  el.innerHTML =
    '<span class="harbor-badge-dot"></span>' +
    `<span><strong>${label}</strong> - this is the portal you sign in to. ` +
    "Check the address before entering credentials anywhere.</span>";
  return el;
}

function toast(text) {
  const existing = document.querySelector(".harbor-toast");
  if (existing) existing.remove();
  const el = document.createElement("div");
  el.className = "harbor-toast";
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 5000);
}

let done = false;

async function run() {
  if (done) return;
  const { domain, label, enabled } = await settings();
  if (!enabled) return;

  const anchors = [...document.querySelectorAll("a[href]")].filter((a) =>
    matches(a, domain),
  );
  if (anchors.length === 0) return;

  const block = resultBlock(anchors[0]);
  if (!block || block.classList.contains("harbor-hit")) return;

  done = true;

  // Dim the other result blocks so the eye goes to one place. Comparing whole
  // blocks rather than DOM siblings keeps this correct however deeply the
  // engine nests its containers.
  for (const el of allResultBlocks()) {
    if (el === block || el.contains(block) || block.contains(el)) continue;
    el.classList.add("harbor-dim");
  }

  block.classList.add("harbor-hit");
  block.parentElement?.insertBefore(badge(label), block.nextSibling);
  block.scrollIntoView({ block: "center", behavior: "smooth" });
}

// Search pages rewrite their results after first paint, so watch for a while
// rather than reading the DOM once.
const observer = new MutationObserver(() => void run());
observer.observe(document.documentElement, { childList: true, subtree: true });
void run();

setTimeout(() => {
  observer.disconnect();
  if (!done) {
    settings().then(({ domain, enabled }) => {
      if (enabled) toast(`Harbor Finder: ${domain} is not on this page of results.`);
    });
  }
}, 6000);
