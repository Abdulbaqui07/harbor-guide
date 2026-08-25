"use client";

import { useActionState } from "react";
import { createRequestAction, type RequestState } from "../../actions";

const KINDS = [
  "Gate Release",
  "Reefer Plug-in",
  "Customs Inspection",
  "Reweigh",
] as const;

const initial: RequestState = {};

const inputClass =
  "mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent";

export default function RequestForm({ containerId }: { containerId: string }) {
  const [state, formAction, pending] = useActionState(
    createRequestAction,
    initial,
  );

  return (
    <form
      action={formAction}
      data-tutorial-id="request-form"
      className="rounded-xl border border-border bg-surface p-6"
    >
      <input type="hidden" name="containerId" value={containerId} />

      <div className="space-y-5">
        <div>
          <label htmlFor="kind" className="block text-sm font-medium">
            Request type
          </label>
          <select
            id="kind"
            name="kind"
            required
            data-tutorial-id="request-type"
            className={inputClass}
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="haulier" className="block text-sm font-medium">
            Haulier
          </label>
          <input
            id="haulier"
            name="haulier"
            required
            placeholder="Al Noor Transport LLC"
            data-tutorial-id="request-haulier"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="collectionDate" className="block text-sm font-medium">
            Collection date
          </label>
          <input
            id="collectionDate"
            name="collectionDate"
            type="date"
            required
            data-tutorial-id="request-date"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium">
            Notes <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            maxLength={500}
            placeholder="Anything the yard team should know."
            data-tutorial-id="request-notes"
            className={`${inputClass} resize-y`}
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
          data-tutorial-id="request-submit"
          className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Submitting…" : "Submit request"}
        </button>
      </div>
    </form>
  );
}
