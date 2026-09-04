import { createClient } from "@supabase/supabase-js";

const REQUIRED_TEST_USERS = [
  {
    key: "ADMIN",
    fullName: "Test Admin",
    role: "admin",
    phone: "+27000000001",
  },
  {
    key: "STAFF",
    fullName: "Test Staff",
    role: "staff",
    phone: "+27000000002",
  },
  {
    key: "DRIVER",
    fullName: "Test Driver",
    role: "driver",
    phone: "+27000000003",
  },
];

function fail(message) {
  throw new Error(`Development test-account provisioning stopped: ${message}`);
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
  if (process.env.NODE_ENV === "production") {
    fail("NODE_ENV is production.");
  }

  if (process.env.VMC_ENVIRONMENT !== "development") {
    fail("VMC_ENVIRONMENT must be exactly development.");
  }

  if (process.env.VMC_DEV_TEST_MODE !== "enabled") {
    fail("VMC_DEV_TEST_MODE must be exactly enabled.");
  }

  if (!isLocalSupabaseUrl(url) && process.env.VMC_ALLOW_REMOTE_DEVELOPMENT_SUPABASE !== "true") {
    fail("the Supabase URL is remote. Set VMC_ALLOW_REMOTE_DEVELOPMENT_SUPABASE=true only for an isolated development project.");
  }
}

function credentialsFor(user) {
  const email = readRequired(`VMC_TEST_${user.key}_EMAIL`).toLowerCase();
  const password = readRequired(`VMC_TEST_${user.key}_PASSWORD`);

  if (password.length < 16 || password.includes("replace-with")) {
    fail(`VMC_TEST_${user.key}_PASSWORD must be a unique development password of at least 16 characters.`);
  }

  return { ...user, email, password };
}

async function findUserByEmail(adminClient, email) {
  const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (error) {
    fail(`could not list Auth users: ${error.message}`);
  }

  return data.users.find((user) => user.email?.toLowerCase() === email) ?? null;
}

async function ensureAuthUser(adminClient, account) {
  const existingUser = await findUserByEmail(adminClient, account.email);
  const shouldResetPassword = process.env.VMC_RESET_DEV_TEST_PASSWORDS === "true";

  if (existingUser) {
    if (shouldResetPassword) {
      const { error } = await adminClient.auth.admin.updateUserById(existingUser.id, {
        password: account.password,
        email_confirm: true,
        user_metadata: { full_name: account.fullName, phone: account.phone },
      });

      if (error) {
        fail(`could not reset ${account.email}: ${error.message}`);
      }
    }

    return existingUser.id;
  }

  const { data, error } = await adminClient.auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true,
    user_metadata: { full_name: account.fullName, phone: account.phone },
  });

  if (error || !data.user) {
    fail(`could not create ${account.email}: ${error?.message ?? "unknown error"}`);
  }

  return data.user.id;
}

async function ensureProfile(adminClient, account, userId) {
  const { error } = await adminClient.from("profiles").upsert(
    {
      id: userId,
      full_name: account.fullName,
      email: account.email,
      phone: account.phone,
      role: account.role,
    },
    { onConflict: "id" },
  );

  if (error) {
    fail(`could not set the ${account.role} role for ${account.email}: ${error.message}`);
  }

  if (account.role === "staff") {
    const { error: staffProfileError } = await adminClient
      .from("staff_profiles")
      .upsert({ profile_id: userId }, { onConflict: "profile_id" });

    if (staffProfileError) {
      fail(`could not create staff profile for ${account.email}: ${staffProfileError.message}`);
    }
  }
}

async function ensureDriverFixture(adminClient, account, userId, fixtureNumber) {
  const registrationNumber = `TEST-VMC-${String(fixtureNumber).padStart(3, "0")}`;
  const { data: bike, error: bikeError } = await adminClient
    .from("bikes")
    .upsert(
      {
        brand: "HERO",
        model: `Test HERO Bike ${fixtureNumber}`,
        colour: "Development Blue",
        registration_number: registrationNumber,
        vin: `TESTVMCVIN${String(fixtureNumber).padStart(5, "0")}`,
        engine_number: `TESTVMCENG${String(fixtureNumber).padStart(5, "0")}`,
        licence_disc_information: "Development test fixture only",
        status: "assigned",
      },
      { onConflict: "registration_number" },
    )
    .select("id")
    .single();

  if (bikeError || !bike) {
    fail(`could not create ${registrationNumber}: ${bikeError?.message ?? "unknown error"}`);
  }

  const { error: driverError } = await adminClient.from("drivers").upsert(
    {
      profile_id: userId,
      bike_id: bike.id,
      status: "active",
      start_date: "2026-01-01",
    },
    { onConflict: "profile_id" },
  );

  if (driverError) {
    fail(`could not create driver fixture for ${account.email}: ${driverError.message}`);
  }
}

async function provisionAccount(adminClient, account, fixtureNumber) {
  const userId = await ensureAuthUser(adminClient, account);
  await ensureProfile(adminClient, account, userId);

  if (account.role === "driver") {
    await ensureDriverFixture(adminClient, account, userId, fixtureNumber);
  }

  return account;
}

async function main() {
  const url = readRequired("NEXT_PUBLIC_SUPABASE_URL");
  const adminKey = process.env.SUPABASE_SECRET_KEY?.trim()
    || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!adminKey) {
    fail("missing SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY for an older local project).");
  }
  assertDevelopmentGuard(url);

  const adminClient = createClient(url, adminKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const accounts = REQUIRED_TEST_USERS.map(credentialsFor);

  for (const account of accounts) {
    await provisionAccount(adminClient, account, 1);
  }

  if (process.env.VMC_INCLUDE_SECOND_TEST_DRIVER === "true") {
    const secondDriver = credentialsFor({
      key: "SECOND_DRIVER",
      fullName: "Test Driver Two",
      role: "driver",
      phone: "+27000000004",
    });
    await provisionAccount(adminClient, secondDriver, 2);
  }

  console.log("Development-only VMC test accounts are ready:");
  console.log("- Test Admin  -> /management");
  console.log("- Test Staff  -> /management");
  console.log("- Test Driver -> /driver");
  console.log(process.env.VMC_INCLUDE_SECOND_TEST_DRIVER === "true"
    ? "- Test Driver Two -> RLS comparison fixture created"
    : "- Optional second driver fixture not created");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
