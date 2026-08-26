"use client";

import { useState } from "react";
import { START_EVENT } from "@/components/tutorial/help-button";

type Answer = {
  answer: string;
  targetId: string | null;
  tutorialSlug: string | null;
  usage: { input: number; output: number } | null;
};

const SUGGESTIONS = [
  "Why can't I collect this container?",
  "What does free time mean?",
  "How do I book a collection?",
];

// Standard Sonnet 5 rates, so the figure does not move when intro pricing ends.
const IN_PER_MTOK = 3;
const OUT_PER_MTOK = 15;

export default function AssistantPanel() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Answer | null>(null);

  async function ask(q: string) {
    const text = q.trim();
    if (text.length < 3) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const page =
        document
          .querySelector<HTMLElement>("[data-tutorial-page]")
          ?.dataset.tutorialPage ?? null;

      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, page }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Could not answer.");
      else setResult(data);
    } catch {
      setError("Could not reach the assistant.");
    } finally {
      setBusy(false);
    }
  }

  function highlight(id: string) {
    const el = document.querySelector<HTMLElement>(`[data-tutorial-id="${id}"]`);
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.style.transition = "outline-color 200ms";
    el.style.outline = "3px solid var(--accent)";
    el.style.outlineOffset = "4px";
    el.style.borderRadius = "8px";
    setTimeout(() => {
      el.style.outline = "";
      el.style.outlineOffset = "";
    }, 2600);
    setOpen(false);
  }

  const cost = result?.usage
    ? (result.usage.input / 1e6) * IN_PER_MTOK +
      (result.usage.output / 1e6) * OUT_PER_MTOK
    : null;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 rounded-full bg-accent px-5 py-3 text-sm font-medium text-accent-fg shadow-lg transition-opacity hover:opacity-90"
      >
        Ask about this screen
      </button>
    );
  }

  return (
    <aside className="fixed bottom-6 right-6 z-40 w-[min(24rem,calc(100vw-3rem))] rounded-xl border border-border bg-surface p-5 shadow-2xl">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Ask about this screen</p>
        <button
          onClick={() => setOpen(false)}
          className="text-xs text-muted transition-colors hover:text-foreground"
        >
          Close
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(question);
        }}
        className="mt-3"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What do I do here?"
          maxLength={300}
          autoFocus
          className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent"
        />
        <button
          type="submit"
          disabled={busy || question.trim().length < 3}
          className="mt-2.5 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {busy ? "Thinking..." : "Ask"}
        </button>
      </form>

      {!result && !busy && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => {
                setQuestion(s);
                void ask(s);
              }}
              className="rounded-full border border-border px-2.5 py-1 text-left text-xs text-muted transition-colors hover:border-accent hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-signal/12 px-3 py-2 text-sm text-signal">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-4">
          <p className="text-sm leading-relaxed">{result.answer}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            {result.targetId && (
              <button
                onClick={() => highlight(result.targetId!)}
                className="rounded-lg border border-accent/50 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent"
              >
                Show me where
              </button>
            )}
            {result.tutorialSlug && (
              <button
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent(START_EVENT, {
                      detail: { slug: result.tutorialSlug },
                    }),
                  );
                  setOpen(false);
                }}
                className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg"
              >
                Walk me through it
              </button>
            )}
          </div>

          {cost !== null && (
            <p className="mt-3 font-mono text-[10px] text-muted">
              claude-sonnet-5 · {result.usage!.input}/{result.usage!.output} tokens · ${cost.toFixed(4)}
            </p>
          )}
        </div>
      )}
    </aside>
  );
}
