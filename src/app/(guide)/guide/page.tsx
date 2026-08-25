import Link from "next/link";
import { listTutorials } from "@/lib/tutorials";

// Reads the tutorial list from Postgres, so it must not be baked at build time.
export const dynamic = "force-dynamic";

const JOURNEY = [
  { n: 1, label: "Search the web", body: "Start where a real user starts - a search engine, not a bookmark." },
  { n: 2, label: "Spot the right result", body: "Learn which result is your terminal's portal, and how to tell it from the rest." },
  { n: 3, label: "Sign in", body: "Land on the portal and get through the door." },
  { n: 4, label: "Book a gate release", body: "Find a container and raise a collection request, guided at every field." },
];

export default async function GuideHome() {
  const tutorials = await listTutorials();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
        Harbor Guide
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
        Never used the portal before?
      </h1>
      <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted">
        This walks you the whole way - from typing a search into your browser to
        holding a confirmed collection reference. Nothing to read first, nothing
        to install.
      </p>

      <ol className="mt-10 space-y-3">
        {JOURNEY.map((s) => (
          <li
            key={s.n}
            className="flex gap-4 rounded-xl border border-border bg-surface p-5"
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 font-mono text-xs">
              {s.n}
            </span>
            <div>
              <p className="text-sm font-semibold">{s.label}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/guide/search"
          className="rounded-lg bg-accent px-6 py-3 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90"
        >
          Start from a web search
        </Link>
        <Link
          href="/login?tutorial=first-gate-release"
          className="rounded-lg border border-border px-6 py-3 text-sm transition-colors hover:border-accent"
        >
          Skip to the portal
        </Link>
        <Link
          href="/guide/authoring"
          className="rounded-lg border border-border px-6 py-3 text-sm transition-colors hover:border-accent"
        >
          Author one with AI
        </Link>
      </div>

      {tutorials.length > 0 && (
        <section className="mt-14">
          <h2 className="text-sm font-semibold">Available walkthroughs</h2>
          <ul className="mt-4 space-y-2">
            {tutorials.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/login?tutorial=${t.slug}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-border bg-surface px-5 py-4 transition-colors hover:border-accent"
                >
                  <span className="text-sm font-medium">{t.title}</span>
                  <span className="text-sm text-muted">{t.description}</span>
                  <span className="ml-auto flex items-center gap-3 font-mono text-xs text-muted">
                    <span>{t.step_count} steps</span>
                    <span className="rounded bg-surface-2 px-2 py-0.5">
                      {t.source === "ai" ? "AI-authored" : "hand-written"}
                    </span>
                    <span>v{t.version}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-14 text-xs leading-relaxed text-muted">
        <Link href="/" className="hover:text-accent">
          ← Harbor overview
        </Link>
      </p>
    </main>
  );
}
