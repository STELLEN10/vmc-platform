"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { createClient } from "@/lib/supabase/client";

function AuthConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextTarget = searchParams.get("next") || "/management/set-password";

  const [status, setStatus] = useState<"processing" | "error" | "success">("processing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function processAuth() {
      try {
        const supabase = createClient();
        const hash = window.location.hash;

        // Check if there is an error in the hash fragment
        if (hash.includes("error=")) {
          const params = new URLSearchParams(hash.replace(/^#/, ""));
          const errorDesc = params.get("error_description") || params.get("error") || "Authentication link invalid";
          setStatus("error");
          setErrorMessage(decodeURIComponent(errorDesc.replace(/\+/g, " ")));
          return;
        }

        // Check for access_token and refresh_token in hash (Implicit Grant)
        if (hash.includes("access_token=")) {
          const params = new URLSearchParams(hash.replace(/^#/, ""));
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");
          const type = params.get("type");

          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              setStatus("error");
              setErrorMessage("Could not activate session from invitation link. Please request a fresh invitation.");
              return;
            }

            setStatus("success");
            // If it was an invite or recovery, or next points to set-password, navigate there
            if (type === "invite" || type === "recovery" || nextTarget.includes("set-password")) {
              router.replace("/management/set-password");
            } else {
              router.replace(nextTarget);
            }
            return;
          }
        }

        // Check for token_hash in search params (OTP verification)
        const tokenHash = searchParams.get("token_hash");
        const type = searchParams.get("type") as "invite" | "recovery" | "email" | null;

        if (tokenHash && type) {
          const { error: otpError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type === "invite" ? "invite" : type === "recovery" ? "recovery" : "email",
          });

          if (otpError) {
            setStatus("error");
            setErrorMessage("The verification token has expired or is invalid. Please request a new link.");
            return;
          }

          setStatus("success");
          router.replace("/management/set-password");
          return;
        }

        // If user already has an active session
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          setStatus("success");
          router.replace(nextTarget);
          return;
        }

        // Fallback: If no tokens found
        setStatus("error");
        setErrorMessage("No invitation credentials detected. Please open the link directly from your invitation email.");
      } catch {
        setStatus("error");
        setErrorMessage("An unexpected authentication error occurred. Please try again.");
      }
    }

    void processAuth();
  }, [nextTarget, router, searchParams]);

  return (
    <section className="simple-auth-card panel">
      {status === "processing" && (
        <div>
          <p className="eyebrow">VMC SECURITY CHECK</p>
          <h1>Verifying your invitation…</h1>
          <p className="card-copy">
            Please wait while we establish your secure connection to the VMC platform.
          </p>
        </div>
      )}

      {status === "success" && (
        <div>
          <p className="eyebrow eyebrow--success">INVITATION VERIFIED</p>
          <h1>Connection secured</h1>
          <p className="card-copy">Redirecting to account setup…</p>
        </div>
      )}

      {status === "error" && (
        <div>
          <p className="eyebrow eyebrow--danger">AUTHENTICATION NOTICE</p>
          <h1>Invitation link expired or used</h1>
          <p className="form-message form-message--error" style={{ marginBottom: "1.2rem" }}>
            {errorMessage}
          </p>
          <p className="card-copy">
            If you have already created your password, sign in directly below. If your invitation has expired, contact a VMC administrator to re-issue an invite.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem" }}>
            <Link href="/management/login" className="button button--primary">
              Management Sign In
            </Link>
            <Link href="/driver/login" className="button button--outline">
              Driver Sign In
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

export default function AuthConfirmPage() {
  return (
    <main className="simple-auth-page">
      <BrandMark href="/" />
      <Suspense
        fallback={
          <section className="simple-auth-card panel">
            <p className="eyebrow">VMC SECURITY CHECK</p>
            <h1>Connecting…</h1>
            <p className="card-copy">Establishing secure credentials…</p>
          </section>
        }
      >
        <AuthConfirmContent />
      </Suspense>
    </main>
  );
}
