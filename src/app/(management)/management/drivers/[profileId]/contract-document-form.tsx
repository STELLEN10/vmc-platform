"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  prepareContractPdfUpload,
  finalizeContractPdfUpload,
  uploadContractPdf,
  deleteContractPdf,
} from "./actions";

interface ContractDocumentFormProps {
  profileId: string;
  contractId: string;
  documentFileName: string | null;
  documentStoragePath: string | null;
  documentUploadedAt: string | null;
  viewUrl: string | null;
}

export function ContractDocumentForm({
  profileId,
  contractId,
  documentFileName,
  documentStoragePath,
  documentUploadedAt,
  viewUrl,
}: ContractDocumentFormProps) {
  const router = useRouter();
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const hasDocument = Boolean(documentStoragePath);
  const documentLink = viewUrl || `/api/contracts/${contractId}/document`;

  async function handleDelete() {
    if (!hasDocument || isDeleting) return;
    if (!window.confirm("Remove this contract PDF from VMC records? The contract itself will remain active.")) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsDeleting(true);
    try {
      const formData = new FormData();
      formData.append("profileId", profileId);
      formData.append("contractId", contractId);
      await deleteContractPdf(formData);
      setSuccessMessage("Contract PDF removed.");
      router.refresh();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Could not remove the contract PDF.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setStatusMessage("Preparing document...");

    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement | null;
    const file = fileInput?.files?.[0];

    if (!file) {
      setErrorMessage("Please select a contract PDF to upload.");
      setStatusMessage(null);
      return;
    }

    const fileName = file.name.trim();
    const isPdf = fileName.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setErrorMessage("Invalid file format. Only official PDF documents (.pdf) are accepted.");
      setStatusMessage(null);
      return;
    }

    const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25MB
    if (file.size > MAX_SIZE_BYTES) {
      setErrorMessage("File exceeds the 25MB limit. Please upload a smaller PDF.");
      setStatusMessage(null);
      return;
    }

    setIsUploading(true);

    try {
      // Step 1: Request signed upload session from server (lightweight JSON request)
      setStatusMessage("Securing upload session...");
      const prep = await prepareContractPdfUpload({
        profileId,
        contractId,
        fileName,
        fileSize: file.size,
      });

      if (prep.error || !prep.token || !prep.storagePath) {
        // Fallback for smaller files (<= 4MB) if direct upload prep is unavailable
        if (file.size <= 4 * 1024 * 1024) {
          setStatusMessage("Uploading via server backup...");
          const formData = new FormData();
          formData.append("profileId", profileId);
          formData.append("contractId", contractId);
          formData.append("file", file);

          const fallbackResult = await uploadContractPdf(null, formData);
          if (fallbackResult?.error) {
            throw new Error(fallbackResult.error);
          }
          setSuccessMessage("Contract PDF uploaded successfully.");
          setStatusMessage(null);
          setIsUploading(false);
          setShowUploadForm(false);
          router.refresh();
          return;
        }

        throw new Error(prep.error || "Could not initialize upload credentials.");
      }

      // Step 2: Upload file directly from browser to Supabase Storage (bypasses serverless limits)
      setStatusMessage("Uploading PDF directly to storage...");
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("vmc-application-documents")
        .uploadToSignedUrl(prep.storagePath, prep.token, file);

      if (uploadError) {
        console.error("Direct storage upload error:", uploadError);
        throw new Error(`Storage upload error: ${uploadError.message}`);
      }

      // Step 3: Record the document reference in the contract record
      setStatusMessage("Registering document with contract...");
      const finalize = await finalizeContractPdfUpload({
        profileId,
        contractId,
        storagePath: prep.storagePath,
        fileName,
        fileSize: file.size,
      });

      if (finalize.error) {
        throw new Error(finalize.error);
      }

      setSuccessMessage("Contract PDF uploaded successfully.");
      setStatusMessage(null);
      setIsUploading(false);
      setShowUploadForm(false);
      router.refresh();
    } catch (err) {
      console.error("Contract upload caught error:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "An unexpected error occurred during upload. Please try again."
      );
      setStatusMessage(null);
      setIsUploading(false);
    }
  }

  return (
    <div
      key={documentUploadedAt || (hasDocument ? "uploaded" : "none")}
      className="mt-4 pt-4 border-t border-line text-xs"
    >
      <p className="card-label mb-2">CONTRACT DOCUMENT</p>

      {hasDocument ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between bg-paper/60 p-2.5 rounded border border-line">
            <div className="flex items-center gap-2 overflow-hidden">
              <span aria-hidden="true">📄</span>
              <div className="truncate">
                <p className="font-medium text-foreground truncate">
                  {documentFileName || "VMC Rent-to-Own Contract.pdf"}
                </p>
                {documentUploadedAt && (
                  <p className="text-[10px] text-muted">
                    Uploaded: {new Date(documentUploadedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={documentLink}
                target="_blank"
                rel="noopener noreferrer"
                className="button button--secondary py-1 px-3 text-xs"
              >
                View
              </a>
              <button
                type="button"
                onClick={() => {
                  setShowUploadForm((prev) => !prev);
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="button button--secondary py-1 px-3 text-xs"
              >
                {showUploadForm ? "Cancel" : "Replace"}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="button button--secondary py-1 px-3 text-xs"
              >
                {isDeleting ? "Removing…" : "Remove PDF"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="bg-paper/40 p-2.5 rounded border border-line text-muted">
            [No contract PDF uploaded]
          </div>
          {!showUploadForm && (
            <button
              type="button"
              onClick={() => {
                setShowUploadForm(true);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className="button button--secondary w-full text-xs py-1.5"
            >
              Upload Contract PDF
            </button>
          )}
        </div>
      )}

      {showUploadForm && (
        <form
          onSubmit={handleFormSubmit}
          className="mt-3 p-3 bg-paper/40 rounded border border-line flex flex-col gap-2.5"
        >
          <p className="font-semibold text-xs text-foreground">
            {hasDocument ? "Upload replacement PDF" : "Attach official contract PDF"}
          </p>

          <label className="flex flex-col gap-1 text-[11px] text-muted">
            Official Contract PDF (.pdf, max 25MB)
            <input
              type="file"
              name="file"
              accept=".pdf,application/pdf"
              required
              disabled={isUploading}
              className="w-full text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-foreground file:text-background hover:file:opacity-90 disabled:opacity-50"
            />
          </label>

          {statusMessage && (
            <p className="text-action text-xs font-medium animate-pulse" role="status">
              ⏳ {statusMessage}
            </p>
          )}

          {errorMessage && (
            <p className="text-red-500 text-xs font-medium" role="alert">
              {errorMessage}
            </p>
          )}

          {successMessage && (
            <p className="text-green-600 text-xs font-medium" role="status">
              ✓ {successMessage}
            </p>
          )}

          <div className="flex gap-2 justify-end mt-1">
            <button
              type="button"
              onClick={() => {
                setShowUploadForm(false);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              disabled={isUploading}
              className="button button--secondary py-1 px-3 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="button button--primary py-1 px-3 text-xs"
            >
              {isUploading ? "Uploading..." : hasDocument ? "Upload & Replace" : "Upload Contract PDF"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
