"use client";

import { useState } from "react";
import Link from "next/link";

type Step = {
  page: string;
  targetId: string;
  title: string;
  message: string;
  action: string;
  expectedValue: string | null;
};

type Issue = { index: number; targetId: string; page: string; reason: string };

type Result = {
  title: string;
  description: string;
  steps: Step[];
  issues: Issue[];
  rawStepCount: number;
  usage: { input: number; output: number } | null;
  elapsedMs: number;
  saved: { slug: string; stepCount: number } | null;
};

const PRESETS = [
  "Teach a brand-new haulier how to find a container and book a gate release for collection.",
  "Show a user how to tell whether a container is blocked by holds before sending a truck.",
  "Walk someone through checking how much free time is left before demurrage charges start.",
];

export default function AuthoringConsole() {
  const [goal, setGoal] = useState(PRESETS[0]);
  const [slug, setSlug] = useState("ai-generated");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function generate(save: boolean) {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/tutorials/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, slug, save }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Generation failed.");
      else setResult(data);
    } catch {
      setError("Could not reach the generation endpoint.");
    } finally {
      setBusy(false);
    }
  }

  const cost = result?.usage
    ? (result.usage.input / 1e6) * 5 + (result.usage.output / 1e6) * 25
    : null;

  const field =
    "mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent";

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
        Harbor Guide · Authoring
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        Write a tutorial with Claude
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
        Describe what a user should learn. Claude reads the application&apos;s
        element inventory and returns structured steps — never code, and never a
        selector it invented.
      </p>

      <section className="mt-8 rounded-xl border border-border bg-surface p-6">
        <label htmlFor="goal" className="block text-sm font-medium">
          Goal
        </label>
        <textarea
          id="goal"
          rows={3}
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          className={`${field} resize-y`}
        />

        <div className="mt-2 flex flex-wrap gap-2">
          {PRESETS.map((p, i) => (
            <button
              key={p}
              onClick={() => setGoal(p)}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted transition-colors hover:border-accent hover:text-foreground"
            >
              Example {i + 1}
            </button>
          ))}
        </div>

        <label htmlFor="slug" className="mt-5 block text-sm font-medium">
          Slug
        </label>
        <input
          id="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className={`${field} max-w-xs font-mono`}
        />

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => generate(false)}
            disabled={busy}
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Generating…" : "Generate"}
          </button>
          <button
            onClick={() => generate(true)}
            disabled={busy}
            className="rounded-lg border border-border px-5 py-2.5 text-sm transition-colors hover:border-accent disabled:opacity-50"
          >
            Generate &amp; publish
          </button>
        </div>

        {busy && (
          <p className="mt-4 text-sm text-muted">
            Claude is reading the inventory and drafting steps. Usually 25–35
            seconds.
          </p>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-signal/12 px-3 py-2 text-sm text-signal">
            {error}
          </p>
        )}
      </section>

      {result && (
        <section className="mt-6 rounded-xl border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold">{result.title}</h2>
          <p className="mt-1 text-sm text-muted">{result.description}</p>

          <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3 border-y border-border py-4 font-mono text-xs">
            <div>
              <dt className="text-muted">Steps kept</dt>
              <dd className="mt-1 text-sm">
                {result.steps.length} of {result.rawStepCount}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Rejected</dt>
              <dd className={`mt-1 text-sm ${result.issues.length ? "text-signal" : ""}`}>
                {result.issues.length}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Tokens</dt>
              <dd className="mt-1 text-sm">
                {result.usage ? `${result.usage.input} / ${result.usage.output}` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Cost</dt>
              <dd className="mt-1 text-sm">{cost !== null ? `$${cost.toFixed(4)}` : "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">Elapsed</dt>
              <dd className="mt-1 text-sm">{(result.elapsedMs / 1000).toFixed(1)}s</dd>
            </div>
          </dl>

          {result.issues.length > 0 && (
            <div className="mt-5 rounded-lg border border-signal/40 bg-signal/5 p-4">
              <p className="text-sm font-semibold text-signal">
                Rejected by the allowlist
              </p>
              <ul className="mt-2 space-y-1">
                {result.issues.map((i) => (
                  <li key={`${i.index}-${i.targetId}`} className="font-mono text-xs text-muted">
                    step {i.index + 1} · {i.targetId} — {i.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ol className="mt-5 space-y-3">
            {result.steps.map((s, i) => (
              <li key={i} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-muted">
                  <span>{i + 1}</span>
                  <span className="rounded bg-surface-2 px-1.5 py-0.5">{s.page}</span>
                  <span className="rounded bg-surface-2 px-1.5 py-0.5">{s.action}</span>
                  <span className="text-accent">{s.targetId}</span>
                  {s.expectedValue && <span>= {s.expectedValue}</span>}
                </div>
                <p className="mt-2 text-sm font-medium">{s.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{s.message}</p>
              </li>
            ))}
          </ol>

          {result.saved && (
            <div className="mt-6 rounded-lg border border-ok/40 bg-ok/5 p-4">
              <p className="text-sm font-semibold text-ok">
                Published as {result.saved.slug}
              </p>
              <Link
                href={`/login?tutorial=${result.saved.slug}`}
                className="mt-3 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg"
              >
                Run this tutorial
              </Link>
            </div>
          )}
        </section>
      )}

      <p className="mt-10">
        <Link href="/guide" className="text-sm text-muted hover:text-accent">
          ← Back to the guide
        </Link>
      </p>
    </main>
  );
}
