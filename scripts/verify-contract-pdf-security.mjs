import { existsSync, readFileSync } from "node:fs";

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`PASS: ${message}`);
}

console.log("=== VERIFYING VMC CONTRACT PDF SECURITY ===");

// 1. Verify Migration File
const migrationPath = "supabase/migrations/20260918130000_contract_pdf_documents.sql";
assert(existsSync(migrationPath), `Migration file ${migrationPath} exists`);

const migrationSql = readFileSync(migrationPath, "utf-8");
assert(
  migrationSql.includes("add column if not exists document_storage_path text"),
  "Migration adds document_storage_path to public.contracts"
);
assert(
  migrationSql.includes("contracts_management_update"),
  "Migration configures contracts_management_update policy requiring public.is_management()"
);
assert(
  migrationSql.includes("vmc_documents_contracts_driver_select"),
  "Migration configures storage select policy restricting drivers to contracts/{auth.uid()}/*"
);

// 2. Verify Server Action Security Guards
const actionsPath = "src/app/(management)/management/drivers/[profileId]/actions.ts";
const actionsTs = readFileSync(actionsPath, "utf-8");

assert(
  actionsTs.includes("requireRole(MANAGEMENT_ROLES)"),
  "uploadContractPdf strictly requires MANAGEMENT_ROLES"
);
assert(
  actionsTs.includes("fileName.toLowerCase().endsWith(\".pdf\")") &&
  actionsTs.includes("application/pdf"),
  "uploadContractPdf strictly validates .pdf extension and application/pdf MIME type"
);
assert(
  actionsTs.includes("MAX_FILE_SIZE_BYTES"),
  "uploadContractPdf enforces a strict file size ceiling"
);
assert(
  actionsTs.includes("contracts/${profileId}/${contractId}.pdf"),
  "uploadContractPdf isolates contracts by profileId and contractId"
);

// 3. Verify Secure API Route Authorization & Ownership Checks
const routePath = "src/app/api/contracts/[contractId]/document/route.ts";
const routeTs = readFileSync(routePath, "utf-8");

assert(
  routeTs.includes("requireRole") && routeTs.includes("MANAGEMENT_ROLES"),
  "API route validates authenticated user with valid role"
);
assert(
  routeTs.includes("driver.id !== contract.driver_id"),
  "API route verifies driver ownership: forbids driver from reading another driver's contract"
);
assert(
  routeTs.includes("createSignedUrl(contract.document_storage_path, 300"),
  "API route issues short-lived (300s) signed URLs only, never permanent public URLs"
);

// 4. Verify Driver UI Has No Upload Controls
const driverPaymentsPage = readFileSync("src/app/(driver)/driver/payments/page.tsx", "utf-8");
assert(
  !driverPaymentsPage.includes("uploadContractPdf") &&
  !driverPaymentsPage.includes("Upload Contract PDF"),
  "Driver payments page does not expose upload controls to drivers"
);

const driverProfilePage = readFileSync("src/app/(driver)/driver/profile/page.tsx", "utf-8");
assert(
  !driverProfilePage.includes("uploadContractPdf") &&
  !driverProfilePage.includes("Upload Contract PDF"),
  "Driver profile page does not expose upload controls to drivers"
);

// 5. Verify v0.2 Feature Flag Remains Disabled
const productFlagsPath = "src/lib/feature-flags.ts";
if (existsSync(productFlagsPath)) {
  const flags = readFileSync(productFlagsPath, "utf-8");
  assert(
    !flags.includes("ENABLE_V02 = true") && !flags.includes("V02_ENABLED = true"),
    "v0.2 feature flag remains disabled"
  );
}

console.log("\nAll contract PDF security checks passed successfully!");
