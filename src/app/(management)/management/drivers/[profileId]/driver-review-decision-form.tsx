"use client";

import { useActionState } from "react";
import type { DriverOnboardingStatus } from "@/lib/database.types";
import { reviewDriverOnboarding } from "./actions";

interface DriverReviewDecisionFormProps {
  profileId: string;
  initialStatus: DriverOnboardingStatus;
  initialReviewNote: string | null;
}

export function DriverReviewDecisionForm({
  profileId,
  initialStatus,
  initialReviewNote,
}: DriverReviewDecisionFormProps) {
  const [state, formAction, isPending] = useActionState(
    async (prevState: unknown, formData: FormData) => {
      return await reviewDriverOnboarding(formData);
    },
    null
  );

  const defaultSelectStatus =
    initialStatus === "submitted" ? "under_review" : initialStatus;

  return (
    <form className="panel review-form" action={formAction}>
      <input type="hidden" name="profileId" value={profileId} />
      <p className="card-label">VMC REVIEW DECISION</p>

      {state?.error && (
        <p className="form-message form-message--error" role="alert">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="form-message form-message--success" role="status">
          Review decision saved successfully.
        </p>
      )}

      <label>
        Review note
        <textarea
          name="reviewNote"
          defaultValue={initialReviewNote ?? ""}
          placeholder="Optional note shown to the driver"
        />
      </label>

      <label>
        Set status
        <select name="status" defaultValue={defaultSelectStatus}>
          <option value="under_review">Under review</option>
          <option value="changes_requested">Request changes</option>
          <option value="approved">Approve</option>
          <option value="active">Activate</option>
          <option value="rejected">Reject</option>
          <option value="suspended">Suspend</option>
        </select>
      </label>

      <button
        className="button button--primary"
        type="submit"
        disabled={isPending}
      >
        {isPending ? "Saving..." : "Save review decision"}
      </button>
    </form>
  );
}
