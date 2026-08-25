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
    /* private mode — the tutorial still works, it just won't resume */
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

  const start = useCallback(async (slug: string, resumeAt?: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tutorials/${slug}`);
      if (!res.ok) throw new Error("not found");
      const data = (await res.json()) as Tutorial;
      const at = resumeAt ?? 0;
      setTutorial(data);
      setIndex(at);
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
    setIndex((i) => {
      const next = i + 1;
      if (tutorial) persist(tutorial.slug, next, tutorial.steps.length);
      return next;
    });
  }, [tutorial, persist]);

  const goTo = useCallback(
    (n: number) => {
      setIndex(n);
      if (tutorial) persist(tutorial.slug, n, tutorial.steps.length);
    },
    [tutorial, persist],
  );

  const exit = useCallback(() => {
    setTutorial(null);
    setIndex(0);
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
    return value.toLowerCase() === step.expectedValue.trim().toLowerCase();
  }
  return value.length >= 2;
}

export { readState, writeState, STATE_KEY };
