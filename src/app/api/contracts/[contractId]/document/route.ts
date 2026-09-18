import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/authorization";
import { DRIVER_ROLES, MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  const { contractId } = await params;
  if (!contractId) {
    return NextResponse.json({ error: "Contract ID is required." }, { status: 400 });
  }

  let profile;
  try {
    profile = await requireRole([...MANAGEMENT_ROLES, ...DRIVER_ROLES]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isManagement = profile.role === "admin" || profile.role === "staff";
  const isDriver = profile.role === "driver";

  if (!isManagement && !isDriver) {
    return NextResponse.json({ error: "Forbidden: Insufficient permissions." }, { status: 403 });
  }

  const adminClient = createAdminClient();

  // Fetch contract record
  const { data: contract, error: contractError } = await adminClient
    .from("contracts")
    .select("id, driver_id, document_storage_path, document_file_name")
    .eq("id", contractId)
    .maybeSingle();

  if (contractError || !contract || !contract.document_storage_path) {
    return NextResponse.json({ error: "Contract document not found." }, { status: 404 });
  }

  // If driver, verify strict ownership: authenticated user -> profile -> driver -> contract
  if (isDriver && !isManagement) {
    const supabase = await createClient();
    const { data: driver } = await supabase
      .from("drivers")
      .select("id")
      .eq("profile_id", profile.id)
      .maybeSingle();

    if (!driver || driver.id !== contract.driver_id) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to view this contract document." },
        { status: 403 }
      );
    }
  }

  const isDownload =
    request.nextUrl.searchParams.get("download") === "1" ||
    request.nextUrl.searchParams.get("download") === "true";

  // Generate short-lived signed URL (300 seconds / 5 minutes)
  const { data: signedData, error: signError } = await adminClient.storage
    .from("vmc-application-documents")
    .createSignedUrl(contract.document_storage_path, 300, {
      download: isDownload ? (contract.document_file_name || "VMC_Rent_to_Own_Contract.pdf") : undefined,
    });

  if (signError || !signedData?.signedUrl) {
    return NextResponse.json(
      { error: "Failed to generate secure temporary document link." },
      { status: 500 }
    );
  }

  if (request.nextUrl.searchParams.get("format") === "json") {
    return NextResponse.json({
      url: signedData.signedUrl,
      fileName: contract.document_file_name || "VMC_Rent_to_Own_Contract.pdf",
    });
  }

  return NextResponse.redirect(signedData.signedUrl);
}
