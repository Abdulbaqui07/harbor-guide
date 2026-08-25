"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  isStepSatisfied,
  readState,
  useTargetRect,
  useTutorialState,
} from "./use-tutorial";
import { PAGE_LABELS, PAGE_PATHS, type Step } from "./types";

const PAD = 6;
const TIP_W = 350;

function useCurrentPage() {
  const [page, setPage] = useState<string | null>(null);

  useEffect(() => {
    const read = () =>
      document
        .querySelector<HTMLElement>("[data-tutorial-page]")
        ?.dataset.tutorialPage ?? null;

    setPage(read());
    const observer = new MutationObserver(() => setPage(read()));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return page;
}

export default function TutorialEngine() {
  const params = useSearchParams();
  const { tutorial, index, start, advance, goTo, exit } = useTutorialState();
  const currentPage = useCurrentPage();
  const [valid, setValid] = useState(false);
  const [nudge, setNudge] = useState(0);
  const booted = useRef(false);

  // Boot from ?tutorial=slug, otherwise resume whatever was stored.
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;

    const fromUrl = params.get("tutorial");
    const stored = readState();

    if (fromUrl) {
      void start(fromUrl, stored?.slug === fromUrl ? stored.index : 0);
    } else if (stored) {
      void start(stored.slug, stored.index);
    }
  }, [params, start]);

  const step: Step | null =
    tutorial && index < tutorial.steps.length ? tutorial.steps[index] : null;
  const onThisPage = step ? step.page === currentPage : false;
  const rect = useTargetRect(step?.targetId ?? null, onThisPage);

  // Bring the target into view when the step changes.
  useEffect(() => {
    if (!step || !onThisPage) return;
    const el = document.querySelector<HTMLElement>(
      `[data-tutorial-id="${CSS.escape(step.targetId)}"]`,
    );
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [step, onThisPage]);

  // Re-check whether an input/select step is satisfied.
  const recheck = useCallback(() => {
    if (!step) return;
    setValid(
      step.action === "input" || step.action === "select"
        ? isStepSatisfied(step)
        : false,
    );
  }, [step]);

  useEffect(() => {
    recheck();
  }, [recheck]);

  // Click steps advance only on a real click of the real element.
  useEffect(() => {
    if (!step || !onThisPage) return;

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const hit = target?.closest(
        `[data-tutorial-id="${CSS.escape(step.targetId)}"]`,
      );

      if (step.action === "click") {
        if (hit) advance();
        else setNudge((n) => n + 1);
      }
    };

    const onEdit = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (
        target?.closest(`[data-tutorial-id="${CSS.escape(step.targetId)}"]`)
      ) {
        recheck();
      }
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("input", onEdit, true);
    document.addEventListener("change", onEdit, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("input", onEdit, true);
      document.removeEventListener("change", onEdit, true);
    };
  }, [step, onThisPage, advance, recheck]);

  if (!tutorial) return null;

  const total = tutorial.steps.length;

  // ---- Completed -----------------------------------------------------------
  if (index >= total) {
    return (
      <div className="fixed inset-x-0 bottom-6 z-[60] mx-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface p-5 shadow-2xl">
        <p className="text-sm font-semibold">Tutorial complete</p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          You booked a gate release end to end. {total} of {total} steps.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            onClick={exit}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg"
          >
            Done
          </button>
          <button
            onClick={() => goTo(0)}
            className="rounded-lg border border-border px-4 py-2 text-sm"
          >
            Replay
          </button>
        </div>
      </div>
    );
  }

  if (!step) return null;

  // ---- User wandered off the step's page -----------------------------------
  if (!onThisPage) {
    const path = PAGE_PATHS[step.page];
    return (
      <div className="fixed inset-x-0 bottom-6 z-[60] mx-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface p-5 shadow-2xl">
        <p className="font-mono text-xs text-muted">
          Step {index + 1} of {total}
        </p>
        <p className="mt-2 text-sm font-semibold">{step.title}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          This step is on {PAGE_LABELS[step.page] ?? step.page}.
        </p>
        <div className="mt-4 flex gap-2">
          {path && (
            <Link
              href={path}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg"
            >
              Take me there
            </Link>
          )}
          <button
            onClick={exit}
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted"
          >
            Exit
          </button>
        </div>
      </div>
    );
  }

  // ---- Target missing on the page ------------------------------------------
  if (!rect) return null;

  const below = rect.top + rect.height + 200 < window.innerHeight;
  const tipTop = below ? rect.top + rect.height + 14 : rect.top - 14;
  const tipLeft = Math.min(
    Math.max(12, rect.left + rect.width / 2 - TIP_W / 2),
    window.innerWidth - TIP_W - 12,
  );

  return (
    <>
      {/* Spotlight: one element whose enormous box-shadow dims everything else.
          pointer-events:none so the user really does click the real control. */}
      <div
        aria-hidden
        key={nudge}
        className="pointer-events-none fixed z-50 rounded-lg ring-2 ring-accent transition-all duration-200"
        style={{
          top: rect.top - PAD,
          left: rect.left - PAD,
          width: rect.width + PAD * 2,
          height: rect.height + PAD * 2,
          boxShadow: "0 0 0 9999px rgba(3, 7, 14, 0.66)",
          animation: nudge ? "harbor-nudge 320ms ease" : undefined,
        }}
      />

      <div
        role="dialog"
        aria-live="polite"
        className="fixed z-[60] rounded-xl border border-border bg-surface p-5 shadow-2xl"
        style={{
          top: tipTop,
          left: tipLeft,
          width: TIP_W,
          transform: below ? undefined : "translateY(-100%)",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-xs text-muted">
            Step {index + 1} of {total}
          </p>
          <button
            onClick={exit}
            className="text-xs text-muted transition-colors hover:text-foreground"
          >
            Exit
          </button>
        </div>

        <p className="mt-2.5 text-sm font-semibold">{step.title}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          {step.message}
        </p>

        <div className="mt-4 flex items-center gap-3">
          {step.action === "click" && (
            <p className="text-xs text-muted">
              Select the highlighted control to continue.
            </p>
          )}

          {(step.action === "input" || step.action === "select") && (
            <button
              onClick={advance}
              disabled={!valid}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition-opacity disabled:opacity-40"
            >
              Continue
            </button>
          )}

          {step.action === "observe" && (
            <button
              onClick={advance}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg"
            >
              Got it
            </button>
          )}

          {(step.action === "input" || step.action === "select") && !valid && (
            <p className="text-xs text-muted">
              {step.expectedValue
                ? `Waiting for “${step.expectedValue}”`
                : "Fill the highlighted field"}
            </p>
          )}
        </div>

        <div className="mt-4 h-1 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
      </div>
    </>
  );
}
