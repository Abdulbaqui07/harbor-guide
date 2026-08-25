"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Rect, Step, Tutorial } from "./types";

const STATE_KEY = "harbor_tutorial";
const VISITOR_KEY = "harbor_visitor";

type Persisted = { slug: string; index: number };

function readState(): Persisted | null {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    return raw ? (JSON.parse(raw) as Persisted) : null;
  } catch {
    return null;
  }
}

function writeState(state: Persisted | null) {
  try {
    if (state) localStorage.setItem(STATE_KEY, JSON.stringify(state));
    else localStorage.removeItem(STATE_KEY);
  } catch {
    /* private mode - the tutorial still works, it just won't resume */
  }
}

export function visitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = `v_${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return "v_anonymous";
  }
}

/** Tracks an element's viewport rect across scroll, resize and layout shifts. */
export function useTargetRect(targetId: string | null, active: boolean) {
  const [rect, setRect] = useState<Rect | null>(null);
  const frame = useRef<number>(0);

  useEffect(() => {
    if (!active || !targetId) {
      setRect(null);
      return;
    }

    let last = "";
    const tick = () => {
      const el = document.querySelector<HTMLElement>(
        `[data-tutorial-id="${CSS.escape(targetId)}"]`,
      );
      if (el) {
        const r = el.getBoundingClientRect();
        const next = {
          top: r.top,
          left: r.left,
          width: r.width,
          height: r.height,
        };
        const key = `${next.top}|${next.left}|${next.width}|${next.height}`;
        if (key !== last) {
          last = key;
          setRect(next);
        }
      } else if (last !== "") {
        last = "";
        setRect(null);
      }
      frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [targetId, active]);

  return rect;
}

export function useTutorialState() {
  const [tutorial, setTutorial] = useState<Tutorial | null>(null);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  // Mirror the index in a ref so advancing never has to read it from inside a
  // state updater. Click steps often navigate, and if the engine unmounts
  // before React runs the updater the save is simply lost - leaving the next
  // page resuming at the previous step.
  const indexRef = useRef(index);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);


  const start = useCallback(async (slug: string, resumeAt?: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tutorials/${slug}`);
      if (!res.ok) throw new Error("not found");
      const data = (await res.json()) as Tutorial;

      // With no explicit resume point, begin at the first step for the page
      // the user is already on - so "Show me how" works from anywhere and a
      // signed-in user never gets sent back to a sign-in step they're past.
      let at = resumeAt;
      if (at === undefined) {
        const page = document
          .querySelector<HTMLElement>("[data-tutorial-page]")
          ?.dataset.tutorialPage;
        const i = page ? data.steps.findIndex((s) => s.page === page) : -1;
        at = i >= 0 ? i : 0;
      }
      setTutorial(data);
      setIndex(at);
      indexRef.current = at;
      writeState({ slug, index: at });
    } catch {
      setTutorial(null);
      writeState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const persist = useCallback(
    (slug: string, nextIndex: number, total: number) => {
      writeState({ slug, index: nextIndex });
      void fetch("/api/tutorials/progress", {
        method: "POST",
        // Steps usually advance as the page navigates away; keepalive lets the
        // browser finish the request instead of cancelling it in flight.
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userKey: visitorId(),
          slug,
          currentStep: nextIndex,
          completed: nextIndex >= total,
        }),
      }).catch(() => {
        /* progress is a convenience, never block the tutorial on it */
      });
    },
    [],
  );

  const advance = useCallback(() => {
    if (!tutorial) return;
    const next = indexRef.current + 1;
    indexRef.current = next;
    setIndex(next);
    // Synchronous, outside the updater: localStorage is written before the
    // browser starts navigating away.
    persist(tutorial.slug, next, tutorial.steps.length);
  }, [tutorial, persist]);

  const goTo = useCallback(
    (n: number) => {
      if (!tutorial) return;
      indexRef.current = n;
      setIndex(n);
      persist(tutorial.slug, n, tutorial.steps.length);
    },
    [tutorial, persist],
  );

  const exit = useCallback(() => {
    setTutorial(null);
    setIndex(0);
    indexRef.current = 0;
    writeState(null);
  }, []);

  return { tutorial, index, loading, start, advance, goTo, exit, setIndex };
}

/** True when the value in the target element satisfies the step. */
export function isStepSatisfied(step: Step): boolean {
  const el = document.querySelector<HTMLInputElement | HTMLSelectElement>(
    `[data-tutorial-id="${CSS.escape(step.targetId)}"]`,
  );
  if (!el) return false;

  const value = (el.value ?? "").trim();

  if (step.expectedValue) {
    const want = step.expectedValue.trim().toLowerCase();
    if (value.toLowerCase() === want) return true;
    // A <select>'s value is rarely what the user sees, so match the visible
    // option label too - that is what a step author would naturally write.
    if (el instanceof HTMLSelectElement) {
      const label = el.selectedOptions[0]?.textContent?.trim().toLowerCase();
      if (label === want) return true;
    }
    return false;
  }

  return value.length >= 2;
}

export { readState, writeState, STATE_KEY };
