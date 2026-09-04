function readRequiredPublicEnvironment(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getSupabasePublicConfig() {
  return {
    url: readRequiredPublicEnvironment("NEXT_PUBLIC_SUPABASE_URL"),
    publishableKey: readRequiredPublicEnvironment(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    ),
  };
}
