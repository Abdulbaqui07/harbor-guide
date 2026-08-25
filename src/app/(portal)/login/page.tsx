import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-24">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
        Harbor Terminal Portal
      </p>
      <h1 className="mt-3 text-2xl font-semibold">Sign in</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        The portal flow lands next: dashboard, container search, result details and
        gate-release requests.
      </p>
      <Link href="/" className="mt-8 text-sm font-medium text-accent">
        ← Back
      </Link>
    </main>
  );
}
