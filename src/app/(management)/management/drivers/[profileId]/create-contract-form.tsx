"use client";

import { useActionState, useEffect, useRef } from "react";
import { createContract } from "./actions";

export function CreateContractForm({ profileId, driverId, bikeId }: { profileId: string; driverId: string; bikeId: string | null }) {
  const [state, formAction, isPending] = useActionState(async (prevState: unknown, formData: FormData) => {
    try { await createContract(formData); return { success: true }; } catch (e) { return { error: e instanceof Error ? e.message : "Unknown error" }; }
  }, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
    }
  }, [state]);

  if (!bikeId) {
    return <p className="text-xs text-muted mt-2 border-t border-line pt-2">Assign a motorcycle to create a contract.</p>;
  }

  return (
    <form ref={formRef} action={formAction} className="mt-4 pt-4 border-t border-line flex flex-col gap-3">
      <p className="card-label">CREATE RENT-TO-OWN CONTRACT</p>
      <input type="hidden" name="profileId" value={profileId} />
      <input type="hidden" name="driverId" value={driverId} />
      <input type="hidden" name="bikeId" value={bikeId} />
      <div className="grid grid-cols-2 gap-3 text-sm">
        <label>Start Date<input type="date" name="startDate" required className="w-full mt-1 p-2 border border-line rounded" /></label>
        <label>Weekly Amount (R)<input type="number" name="weeklyAmount" required min="1" step="0.01" placeholder="e.g. 500" className="w-full mt-1 p-2 border border-line rounded" /></label>
        <label>Total Weeks<input type="number" name="totalWeeks" required min="1" max="520" placeholder="e.g. 104" className="w-full mt-1 p-2 border border-line rounded" /></label>
        <label>Payment Day<select name="paymentWeekday" required className="w-full mt-1 p-2 border border-line rounded"><option value="1">Monday</option><option value="2">Tuesday</option><option value="3">Wednesday</option><option value="4">Thursday</option><option value="5">Friday</option><option value="6">Saturday</option><option value="0">Sunday</option></select></label>
      </div>
      {state?.error && <p className="text-red-500 text-xs">{state.error}</p>}
      {state?.success && <p className="text-green-600 text-xs">Contract created successfully.</p>}
      <button className="button button--primary w-full text-xs" type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create Contract & Generate Schedule"}
      </button>
    </form>
  );
}
