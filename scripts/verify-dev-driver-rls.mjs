import { createClient } from "@supabase/supabase-js";

function fail(message) {
  throw new Error(`Development RLS verification stopped: ${message}`);
}

function readRequired(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    fail(`missing ${name}. Copy .env.development.example to .env.development.local.`);
  }

  return value;
}

function isLocalSupabaseUrl(value) {
  try {
    const { hostname } = new URL(value);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  } catch {
    return false;
  }
}

function assertDevelopmentGuard(url) {
  if (process.env.NODE_ENV === "production" || process.env.VMC_ENVIRONMENT !== "development") {
    fail("this verifier is restricted to development.");
  }

  if (process.env.VMC_DEV_TEST_MODE !== "enabled") {
    fail("VMC_DEV_TEST_MODE must be exactly enabled.");
  }

  if (!isLocalSupabaseUrl(url) && process.env.VMC_ALLOW_REMOTE_DEVELOPMENT_SUPABASE !== "true") {
    fail("the Supabase URL is remote without explicit development approval.");
  }
}

function assertResult(condition, message) {
  if (!condition) {
    fail(message);
  }
}

async function main() {
  const url = readRequired("NEXT_PUBLIC_SUPABASE_URL");
  const publishableKey = readRequired("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const email = readRequired("VMC_TEST_DRIVER_EMAIL");
  const password = readRequired("VMC_TEST_DRIVER_PASSWORD");
  assertDevelopmentGuard(url);

  const client = createClient(url, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: signInData, error: signInError } = await client.auth.signInWithPassword({ email, password });

  if (signInError || !signInData.user) {
    fail(`could not sign in as Test Driver: ${signInError?.message ?? "unknown error"}`);
  }

  const [profilesResult, driversResult, bikesResult, onboardingsResult, staffProfilesResult] = await Promise.all([
    client.from("profiles").select("id, role"),
    client.from("drivers").select("profile_id, bike_id"),
    client.from("bikes").select("id"),
    client.from("driver_onboardings").select("profile_id, onboarding_status"),
    client.from("staff_profiles").select("id"),
  ]);

  for (const result of [profilesResult, driversResult, bikesResult, onboardingsResult, staffProfilesResult]) {
    if (result.error) {
      fail(`database query failed: ${result.error.message}`);
    }
  }

  assertResult(
    profilesResult.data.length === 1
      && profilesResult.data[0].id === signInData.user.id
      && profilesResult.data[0].role === "driver",
    "Test Driver could read a profile other than their own or did not receive the driver role.",
  );
  assertResult(
    driversResult.data.length === 1 && driversResult.data[0].profile_id === signInData.user.id,
    "Test Driver could read another driver's record or could not read their own record.",
  );
  assertResult(
    bikesResult.data.length === 1 && bikesResult.data[0].id === driversResult.data[0].bike_id,
    "Test Driver could read a bike other than their assigned bike or could not read it.",
  );
  assertResult(
    onboardingsResult.data.length === 1 && onboardingsResult.data[0].profile_id === signInData.user.id,
    "Test Driver could read another driver's onboarding record or could not read their own record.",
  );
  assertResult(staffProfilesResult.data.length === 0, "Test Driver could read staff profiles.");

  await client.auth.signOut();
  console.log("PASS: Test Driver can read only their own profile, driver record, onboarding record and assigned bike; staff profiles remain hidden.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
