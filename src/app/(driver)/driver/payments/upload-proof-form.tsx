"use client";

import { useActionState, useRef } from "react";
import { uploadPaymentProof } from "./actions";

export function UploadProofForm({ paymentPeriodId }: { paymentPeriodId: string }) {
  const [state, formAction, isPending] = useActionState(async (prevState: unknown, formData: FormData) => {
    try { await uploadPaymentProof(formData); return { success: true }; } catch (e) { return { error: e instanceof Error ? e.message : "Unknown error" }; }
  }, null);
  const formRef = useRef<HTMLFormElement>(null);

  if (state?.success) {
    return <p className="text-green-600 text-xs mt-2">Proof uploaded successfully. Awaiting review.</p>;
  }

  return (
    <form ref={formRef} action={formAction} className="mt-2 flex flex-col gap-2">
      <input type="hidden" name="paymentPeriodId" value={paymentPeriodId} />
      <input type="file" name="file" required accept="image/*,.pdf" className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-action/10 file:text-action hover:file:bg-action/20" />
      {state?.error && <p className="text-red-500 text-xs">{state.error}</p>}
      <button className="button button--primary text-xs w-fit py-1 px-3 min-h-0" type="submit" disabled={isPending}>
        {isPending ? "Uploading..." : "Upload Proof"}
      </button>
    </form>
  );
}
