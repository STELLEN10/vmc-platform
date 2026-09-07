export function getSupabasePublicConfig() {
  // NEXT_PUBLIC values must be referenced directly. Next.js replaces direct
  // references in the browser bundle during the Vercel build; indexed access
  // such as process.env[name] remains unresolved client-side.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!publishableKey) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }

  return {
    url,
    publishableKey,
  };
}
