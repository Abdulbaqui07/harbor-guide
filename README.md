# Harbor

One application: a container-terminal portal with onboarding built into it, so
a first-time user can find it in a browser and learn it without help.

**Live: https://harbor-guide.vercel.app**

Demo account - `operator@harbor.dev` / `harbor123`

---

## The two halves

They are two parts of one deployment, not two products. The onboarding layer has
to run inside the portal - same-origin policy means nothing at another origin can
read the portal's DOM to highlight it.

**Harbor Terminal Portal** (`src/app/(portal)`) is the product. Hauliers sign
in, scan the yard, search for a container, check its holds and remaining free
time, and raise a gate release so a truck can collect it.

**Harbor Guide** (`src/app/(guide)`) teaches that journey. It starts where a
real user starts - a web search - highlights the right result, hands off into
the portal, and then walks them through their first request field by field.

Start the full experience at [`/guide`](https://harbor-guide.vercel.app/guide),
or jump straight in:
[`/login?tutorial=first-gate-release`](https://harbor-guide.vercel.app/login?tutorial=first-gate-release).

## How the tutorial engine works

Tutorials are **data, not code**. A step is a row:

| column | meaning |
|---|---|
| `page` | the `data-tutorial-page` it happens on |
| `target_id` | the `data-tutorial-id` to spotlight |
| `action` | `click` · `input` · `select` · `observe` |
| `expected_value` | the exact value that satisfies the step, if any |
| `title` / `message` | what the user reads |

Every interactive element in the portal carries a stable `data-tutorial-id`,
and every page a `data-tutorial-page`. The engine reads steps from Postgres,
tracks the target's rect on an animation frame so the spotlight follows scroll
and layout shifts, and **gates progress on the user actually doing the thing** -
click steps advance only on a real click of the real element, field steps keep
Continue disabled until the value validates. Progress is persisted, so a
tutorial survives navigation and reloads.

Rewording a step, reordering, or adding one is an `UPDATE`. No deploy.

## The discovery step

`/guide/search` reproduces a search-results page with the portal among
plausible competitors, dims the rest, and teaches the habit of checking the
address bar before signing in anywhere.

It is a **simulation, and the page says so**. Same-origin policy means no web
page can reach into a real search engine's results and highlight anything.
Doing it for real requires a browser extension holding an explicit permission
for that site. The constraint is worth stating rather than faking past.

## AI authoring

[`/guide/authoring`](https://harbor-guide.vercel.app/guide/authoring) writes a
tutorial from a plain-English goal, using **LangChain.js** with
`ChatAnthropic` and `withStructuredOutput()` against a zod schema - Claude
returns validated step records, never prose and never code. Roughly 20 seconds
and $0.06 per tutorial.

Two guardrails, and the second exists because the first was not enough:

**A selector allowlist.** Claude only ever sees an inventory of real pages and
element IDs harvested from the running app. Anything it references outside that
set is dropped and reported.

**An eval that runs the tutorial.** `npm run eval -- <slug>` drives the whole
thing in Chromium and reports the step it stalls on. It caught three defects
the allowlist approved:

- a step targeting `container-held` - a label the *harvester* invented, not a
  real `data-tutorial-page`, so it could never match at runtime
- steps pointing at `container-holds` on a container that has none: the element
  exists on that page, but only in a state the tutorial never navigated to
- `expectedValue: "Any status"` - the label a user reads - when the element's
  value is `"all"`, so the step could never be satisfied

Each became a contract fix: the inventory is keyed on real page attributes,
marks state-dependent elements `conditional`, and records each select's actual
option labels; the prompt forbids referencing a conditional element before
reaching its state.

Static validation is necessary and not sufficient. That is the argument for
evals.

## The in-app assistant

Signed-in users get an **Ask about this screen** panel. It answers from the same
element inventory the tutorial generator uses, plus the published tutorial list,
so it can only talk about controls that genuinely exist.

Its structured reply carries three fields: the answer, optionally a
`targetId` to spotlight, and optionally a `tutorialSlug` to run. Both are checked
against the allowlist before the UI acts on them - a suggestion the app cannot
carry out is worse than no suggestion. Asking "why can't I collect this
container?" on a held container returns the answer, highlights the holds panel,
and offers the tutorial that covers it.

It runs on `claude-sonnet-5` at roughly $0.008 a question, against
`claude-opus-5` for tutorial authoring where output is long and quality matters
more than latency. Both endpoints require a session: they spend money per call,
and an ungated one on a public URL is a spend button.

## Running it

```bash
npm install
cp .env.example .env.local     # then fill in the three values
npm run db:migrate             # create tables
npm run db:seed                # containers + the hand-written tutorial
npm run dev
```

| variable | purpose |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string |
| `AUTH_SECRET` | signing key for the session cookie |
| `ANTHROPIC_API_KEY` | only needed for AI authoring |

## Verification

```bash
npm run flow-check       # portal journey, 10 assertions
npm run tutorial-check   # engine behaviour, 10 assertions
npm run eval -- <slug>   # static + dynamic check of one tutorial
npm run db:reset-demo    # clear requests and progress before a demo
```

All of them accept `BASE_URL=https://harbor-guide.vercel.app` to run against
production rather than localhost. Several bugs here only ever appeared against
production - a progress write cancelled mid-navigation was invisible locally.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · Neon Postgres ·
`jose` for JWT sessions · zod · LangChain.js + Claude Opus 5 · Playwright ·
Vercel, functions pinned to `fra1` beside the database.

## Deliberately not here

A modular monolith is the right size for this. Queues, a vector store, a
service split and an observability stack are all defensible *later*, and all
would be cargo cult *now* - see the design notes for where each would earn its
place.

The one component genuinely missing is the **browser extension** for the
discovery step. It is the only honest way to highlight a result inside a real
search engine, and it is a separate build with its own permission model.
