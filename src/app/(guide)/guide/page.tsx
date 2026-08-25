import Link from "next/link";

export default function GuidePage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-24">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
        Harbor Guide
      </p>
      <h1 className="mt-3 text-2xl font-semibold">Walkthrough</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        The discovery step, the step engine and the highlight overlay land next.
      </p>
      <Link href="/" className="mt-8 text-sm font-medium text-accent">
        ← Back
      </Link>
    </main>
  );
}
