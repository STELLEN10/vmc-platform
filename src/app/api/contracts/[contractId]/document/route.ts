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

  const isRaw =
    request.nextUrl.searchParams.get("raw") === "1" ||
    request.nextUrl.searchParams.get("raw") === "true";

  if (isDownload || isRaw) {
    return NextResponse.redirect(signedData.signedUrl);
  }

  const docName = contract.document_file_name || "VMC_Rent_to_Own_Contract.pdf";
  const defaultDashboard = isManagement ? "/management/documents" : "/driver/payments";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>VMC Document Viewer - ${docName}</title>
  <style>
    body, html { margin: 0; padding: 0; height: 100%; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #fff; overflow: hidden; display: flex; flex-direction: column; }
    .header { height: 50px; background: #0f172a; border-bottom: 1px solid #334155; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; box-sizing: border-box; }
    .back-btn { background: #f59e0b; color: #020617; text-decoration: none; font-weight: 800; font-size: 13px; padding: 7px 14px; border-radius: 8px; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; border: none; transition: background 0.15s; }
    .back-btn:hover { background: #fbbf24; }
    .title { font-size: 13px; font-weight: 600; color: #e2e8f0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 400px; }
    .actions { display: flex; align-items: center; gap: 8px; }
    .btn { background: #1e293b; color: #cbd5e1; text-decoration: none; font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 6px; border: 1px solid #334155; transition: all 0.15s; }
    .btn:hover { background: #334155; color: #fff; }
    iframe { flex: 1; width: 100%; height: calc(100% - 50px); border: none; background: #f8fafc; }
  </style>
</head>
<body>
  <div class="header">
    <div style="display:flex;align-items:center;gap:12px;">
      <button class="back-btn" onclick="if(window.history.length > 1){window.history.back();}else{window.location.href='${defaultDashboard}';}">
        ← Back to Page
      </button>
      <span class="title">${docName}</span>
    </div>
    <div class="actions">
      <a href="${signedData.signedUrl}" class="btn" download="${docName}">
        Download PDF
      </a>
      <a href="${defaultDashboard}" class="btn">
        Return to Portal
      </a>
    </div>
  </div>
  <iframe src="${signedData.signedUrl}" title="PDF Document Viewer"></iframe>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
