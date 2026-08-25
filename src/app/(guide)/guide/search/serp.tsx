"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const QUERY = "harbor terminal portal container gate release";

type Result = {
  title: string;
  url: string;
  crumb: string;
  snippet: string;
  ours?: boolean;
};

const RESULTS: Result[] = [
  {
    title: "Terminal Operations Handbook (PDF) - PortLogix",
    url: "portlogix.example/resources/handbook",
    crumb: "portlogix.example › resources",
    snippet:
      "A 90-page reference covering yard planning, gate procedures and container handling standards for mid-size terminals.",
  },
  {
    title: "Harbor Terminal Portal - Container tracking & gate requests",
    url: "harbor-guide.vercel.app",
    crumb: "harbor-guide.vercel.app",
    snippet:
      "Sign in to track containers in the yard, check free time and holds, and raise gate release requests for collection.",
    ours: true,
  },
  {
    title: "Container tracking software compared (2026) - FreightWire",
    url: "freightwire.example/reviews/container-tracking",
    crumb: "freightwire.example › reviews",
    snippet:
      "We tested eleven terminal operating systems on usability, reporting and gate automation. Here's how they ranked.",
  },
  {
    title: "How do I book a gate release? - CargoDesk Forum",
    url: "forum.cargodesk.example/t/gate-release/9182",
    crumb: "forum.cargodesk.example › t",
    snippet:
      "Been waiting three days on a release for a 40HC. Does anyone know if the haulier needs to be registered first?",
  },
  {
    title: "Northgate Terminals - Customer services",
    url: "northgate-terminals.example/services",
    crumb: "northgate-terminals.example",
    snippet:
      "Berthing, stevedoring, warehousing and inland haulage across three deep-water berths.",
  },
];

export default function SerpSimulation() {
  const [phase, setPhase] = useState<"searching" | "results" | "highlighted">(
    "searching",
  );

  useEffect(() => {
    const a = setTimeout(() => setPhase("results"), 900);
    const b = setTimeout(() => setPhase("highlighted"), 2200);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);

  const dimmed = phase === "highlighted";

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <header className="mb-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
          Step 1 - Discovery
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Finding the portal in a browser
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          This is what a search for your terminal looks like. Several results
          come back and only one of them is the portal you actually sign in to.
        </p>
      </header>

      {/* Simulated browser */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="flex items-center gap-3 border-b border-border bg-surface-2 px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-border" />
            <span className="size-2.5 rounded-full bg-border" />
            <span className="size-2.5 rounded-full bg-border" />
          </div>
          <div className="flex-1 truncate rounded-md bg-surface px-3 py-1.5 font-mono text-xs text-muted">
            search.example/?q={QUERY.replace(/ /g, "+")}
          </div>
        </div>

        <div className="p-6">
          <div className="mb-6 flex items-center gap-3 rounded-full border border-border px-4 py-2.5">
            <span aria-hidden className="text-muted">⌕</span>
            <span className="text-sm">{QUERY}</span>
          </div>

          {phase === "searching" ? (
            <p className="py-10 text-center text-sm text-muted">Searching...</p>
          ) : (
            <>
              <p className="mb-4 text-xs text-muted">
                About 41,300 results (0.38 seconds)
              </p>

              <ol className="space-y-6">
                {RESULTS.map((r) => (
                  <li
                    key={r.url}
                    className={`relative transition-all duration-500 ${
                      dimmed && !r.ours ? "opacity-25 blur-[1.5px]" : "opacity-100"
                    }`}
                  >
                    {r.ours && dimmed && (
                      <span
                        aria-hidden
                        className="absolute -inset-x-4 -inset-y-3 rounded-lg ring-2 ring-accent"
                      />
                    )}

                    <div className="relative">
                      <p className="font-mono text-xs text-muted">{r.crumb}</p>
                      {r.ours ? (
                        <Link
                          href="/login?tutorial=first-gate-release"
                          className="mt-1 block text-lg text-accent hover:underline"
                        >
                          {r.title}
                        </Link>
                      ) : (
                        <p className="mt-1 cursor-default text-lg text-accent/70">
                          {r.title}
                        </p>
                      )}
                      <p className="mt-1 text-sm leading-relaxed text-muted">
                        {r.snippet}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      </div>

      {/* Callout */}
      <div
        className={`mt-6 rounded-xl border p-5 transition-all duration-500 ${
          dimmed
            ? "border-accent bg-accent/5 opacity-100"
            : "border-border bg-surface opacity-0"
        }`}
      >
        <p className="text-sm font-semibold">That second result is the one</p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          Check the address before you sign in anywhere:{" "}
          <span className="font-mono text-foreground">harbor-guide.vercel.app</span>.
          The others are handbooks, reviews and forum threads - useful reading,
          but not somewhere you can raise a gate release.
        </p>
        <Link
          href="/login?tutorial=first-gate-release"
          className="mt-4 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90"
        >
          Open the portal and start the walkthrough
        </Link>
      </div>

      <p className="mt-8 max-w-2xl text-xs leading-relaxed text-muted">
        <strong className="font-semibold text-foreground">
          Why this is a simulation.
        </strong>{" "}
        A web page cannot reach into a real search engine&apos;s results and
        highlight anything - the browser&apos;s same-origin policy forbids it,
        and rightly so. Doing it for real needs a browser extension with explicit
        permission for that site. This reproduces the moment faithfully so the
        discovery step can be taught without one.
      </p>

      <p className="mt-8">
        <Link href="/guide" className="text-sm text-muted hover:text-accent">
          ← Back to the guide
        </Link>
      </p>
    </main>
  );
}
