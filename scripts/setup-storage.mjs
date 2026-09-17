import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.development.local" });
config({ path: ".env" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { error } = await supabase.storage.createBucket("vmc-payment-proofs", {
    public: false,
    fileSizeLimit: 10485760, // 10MB
  });

  if (error) {
    if (error.message.includes("already exists") || error.message.includes("duplicate")) {
      console.log("Bucket already exists.");
    } else {
      console.error("Failed to create bucket:", error);
    }
  } else {
    console.log("Created bucket vmc-payment-proofs");
  }
}

main().catch(console.error);
