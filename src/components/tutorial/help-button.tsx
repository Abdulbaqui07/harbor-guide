"use client";

export const START_EVENT = "harbor:start-tutorial";

export default function HelpButton({
  slug = "first-gate-release",
  label = "Show me how",
}: {
  slug?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() =>
        window.dispatchEvent(
          new CustomEvent(START_EVENT, { detail: { slug } }),
        )
      }
      className="rounded-md border border-accent/40 bg-accent/10 px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent/20"
    >
      {label}
    </button>
  );
}
