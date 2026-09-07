import { createClient } from "@supabase/supabase-js";

function fail(message) {
  throw new Error(`Initial VMC admin bootstrap stopped: ${message}`);
}

function readRequired(name) {
  const value = process.env[name]?.trim();
  if (!value) fail(`missing ${name}. Copy .env.bootstrap.example to .env.bootstrap.local.`);
  return value;
}

async function main() {
  const url = readRequired("NEXT_PUBLIC_SUPABASE_URL");
  const secretKey = readRequired("SUPABASE_SECRET_KEY");
  const email = readRequired("VMC_BOOTSTRAP_ADMIN_EMAIL").toLowerCase();
  const password = readRequired("VMC_BOOTSTRAP_ADMIN_PASSWORD");
  const confirmation = readRequired("VMC_BOOTSTRAP_CONFIRMATION");
  const fullName = process.env.VMC_BOOTSTRAP_ADMIN_NAME?.trim() || "VMC Administrator";

  if (confirmation !== "CREATE_INITIAL_VMC_ADMIN") {
    fail("VMC_BOOTSTRAP_CONFIRMATION must be exactly CREATE_INITIAL_VMC_ADMIN.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("VMC_BOOTSTRAP_ADMIN_EMAIL is invalid.");
  if (password.length < 12) fail("VMC_BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters.");

  const client = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: existingAdmins, error: adminQueryError } = await client
    .from("profiles")
    .select("id, email")
    .eq("role", "admin")
    .limit(1);
  if (adminQueryError) fail(`could not verify existing admins: ${adminQueryError.message}`);
  const currentAdmins = existingAdmins ?? [];
  if (currentAdmins.length && currentAdmins[0].email?.toLowerCase() !== email) {
    fail("an initial admin already exists. Use VMC Management Team access to invite staff; do not run bootstrap again.");
  }

  const { data: users, error: usersError } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (usersError) fail(`could not look up Auth users: ${usersError.message}`);
  let user = users.users.find((candidate) => candidate.email?.toLowerCase() === email);

  if (user) {
    const { data, error } = await client.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error || !data.user) fail(`could not update the existing account: ${error?.message ?? "unknown error"}`);
    user = data.user;
  } else {
    const { data, error } = await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error || !data.user) fail(`could not create the administrator account: ${error?.message ?? "unknown error"}`);
    user = data.user;
  }

  const { error: profileError } = await client.from("profiles").upsert(
    { id: user.id, full_name: fullName, email, role: "admin" },
    { onConflict: "id" },
  );
  if (profileError) fail(`could not set the admin role: ${profileError.message}`);

  console.log(`Initial VMC admin is ready for ${email}. Sign in at /login, then use Management → Team access to invite staff.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
