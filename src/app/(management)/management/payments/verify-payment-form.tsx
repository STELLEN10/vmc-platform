"use client";

import { useActionState } from "react";
import { verifyPayment } from "./actions";

export function VerifyPaymentForm({ periodId }: { periodId: string }) {
  const [state, formAction, isPending] = useActionState(async (prevState: unknown, formData: FormData) => {
    try { await verifyPayment(formData); return { success: true }; } catch (e) { return { error: e instanceof Error ? e.message : "Unknown error" }; }
  }, null);

  return (
    <form action={formAction} className="flex items-center justify-end gap-2">
      <input type="hidden" name="periodId" value={periodId} />
      <button name="action" value="reject" className="button button--light text-xs py-1 px-2 min-h-0 text-red-500" type="submit" disabled={isPending}>
        Reject
      </button>
      <button name="action" value="approve" className="button button--primary text-xs py-1 px-2 min-h-0" type="submit" disabled={isPending}>
        Approve
      </button>
      {state?.error && <p className="text-red-500 text-xs absolute mt-8">{state.error}</p>}
    </form>
  );
}
