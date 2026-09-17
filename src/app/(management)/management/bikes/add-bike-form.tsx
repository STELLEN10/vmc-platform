"use client";

import { useActionState, useEffect, useRef } from "react";
import { addBike } from "./actions";

export function AddBikeForm() {
  const [state, formAction, isPending] = useActionState(async (prevState: unknown, formData: FormData) => {
    return await addBike(formData);
  }, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} className="panel review-form" action={formAction}>
      <p className="card-label">ADD MOTORCYCLE</p>
      {state?.error && <p className="form-message form-message--error">{state.error}</p>}
      {state?.success && <p className="form-message form-message--success">Motorcycle added successfully.</p>}
      
      <div className="grid grid-cols-2 gap-4">
        <label>Brand<input name="brand" required placeholder="HERO" defaultValue="HERO" /></label>
        <label>Model<input name="model" required placeholder="Eco 150" /></label>
        <label>Colour<input name="colour" placeholder="Red" /></label>
        <label>Registration Number<input name="registration_number" placeholder="CA 123-456" /></label>
        <label>VIN<input name="vin" placeholder="17-character VIN" /></label>
        <label>Engine Number<input name="engine_number" placeholder="Engine number" /></label>
      </div>
      <button className="button button--primary" type="submit" disabled={isPending}>
        {isPending ? "Adding..." : "Add motorcycle"}
      </button>
    </form>
  );
}
