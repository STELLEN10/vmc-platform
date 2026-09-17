"use client";

import { useActionState } from "react";
import { assignBikeToDriver, unassignBikeFromDriver } from "./actions";

type Bike = { id: string; brand: string; model: string; registration_number: string | null };

export function AssignBikeForm({ profileId, assignedBikeId, availableBikes }: { profileId: string; assignedBikeId: string | null; availableBikes: Bike[] }) {
  const [assignState, assignAction, isAssigning] = useActionState(async (prevState: unknown, formData: FormData) => {
    try { await assignBikeToDriver(formData); return { success: true }; } catch (e) { return { error: e instanceof Error ? e.message : "Unknown error" }; }
  }, null);

  const [unassignState, unassignAction, isUnassigning] = useActionState(async (prevState: unknown, formData: FormData) => {
    try { await unassignBikeFromDriver(formData); return { success: true }; } catch (e) { return { error: e instanceof Error ? e.message : "Unknown error" }; }
  }, null);

  if (assignedBikeId) {
    return (
      <form action={unassignAction} className="mt-4 pt-4 border-t border-line">
        <input type="hidden" name="profileId" value={profileId} />
        {unassignState?.error && <p className="text-red-500 text-xs mb-2">{unassignState.error}</p>}
        <button className="button button--danger w-full text-xs" type="submit" disabled={isUnassigning}>
          {isUnassigning ? "Unassigning..." : "Unassign Motorcycle"}
        </button>
      </form>
    );
  }

  return (
    <form action={assignAction} className="mt-4 pt-4 border-t border-line flex flex-col gap-3">
      <input type="hidden" name="profileId" value={profileId} />
      <select name="bikeId" required className="w-full text-sm p-2 rounded border border-line bg-paper text-ink" aria-label="Select motorcycle">
        <option value="" disabled selected>Select available motorcycle</option>
        {availableBikes.map(bike => (
          <option key={bike.id} value={bike.id}>{bike.brand} {bike.model} {bike.registration_number ? `(${bike.registration_number})` : ""}</option>
        ))}
      </select>
      {assignState?.error && <p className="text-red-500 text-xs">{assignState.error}</p>}
      <button className="button button--primary w-full text-xs" type="submit" disabled={isAssigning || availableBikes.length === 0}>
        {isAssigning ? "Assigning..." : availableBikes.length === 0 ? "No available bikes" : "Assign Motorcycle"}
      </button>
    </form>
  );
}
