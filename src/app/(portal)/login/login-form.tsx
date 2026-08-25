"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type LoginState } from "../actions";

const initial: LoginState = {};

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initial);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <div className="mb-8">
        <span
          aria-hidden
          className="grid size-9 place-items-center rounded-lg bg-accent font-mono text-sm text-accent-fg"
        >
          H
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">
          Harbor Terminal Portal
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Sign in to track containers in the yard and raise gate requests.
        </p>
      </div>

      <form action={formAction} data-tutorial-id="login-form" className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            defaultValue="operator@harbor.dev"
            data-tutorial-id="login-email"
            className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            defaultValue="harbor123"
            data-tutorial-id="login-password"
            className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent"
          />
        </div>

        {state.error && (
          <p
            role="alert"
            className="rounded-lg bg-signal/12 px-3 py-2 text-sm text-signal"
          >
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          data-tutorial-id="login-submit"
          className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 rounded-lg border border-border bg-surface-2 px-3 py-2.5 font-mono text-xs leading-relaxed text-muted">
        Demo account — operator@harbor.dev / harbor123
      </p>

      <Link href="/" className="mt-6 text-sm text-muted hover:text-accent">
        ← Back to overview
      </Link>
    </main>
  );
}
