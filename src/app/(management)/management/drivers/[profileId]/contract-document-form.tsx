"use client";

import { useActionState, useState } from "react";
import { uploadContractPdf } from "./actions";

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
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [state, formAction, isPending] = useActionState(uploadContractPdf, null);

  const hasDocument = Boolean(documentStoragePath);
  const documentLink = viewUrl || `/api/contracts/${contractId}/document`;

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
                onClick={() => setShowUploadForm((prev) => !prev)}
                className="button button--secondary py-1 px-3 text-xs"
              >
                {showUploadForm ? "Cancel" : "Replace"}
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
              onClick={() => setShowUploadForm(true)}
              className="button button--secondary w-full text-xs py-1.5"
            >
              Upload Contract PDF
            </button>
          )}
        </div>
      )}

      {showUploadForm && (
        <form
          action={formAction}
          className="mt-3 p-3 bg-paper/40 rounded border border-line flex flex-col gap-2.5"
        >
          <input type="hidden" name="profileId" value={profileId} />
          <input type="hidden" name="contractId" value={contractId} />

          <p className="font-semibold text-xs text-foreground">
            {hasDocument ? "Upload replacement PDF" : "Attach official contract PDF"}
          </p>

          <label className="flex flex-col gap-1 text-[11px] text-muted">
            Official Contract PDF (.pdf, max 15MB)
            <input
              type="file"
              name="file"
              accept=".pdf,application/pdf"
              required
              className="w-full text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-foreground file:text-background hover:file:opacity-90"
            />
          </label>

          {state?.error && (
            <p className="text-red-500 text-xs font-medium" role="alert">
              {state.error}
            </p>
          )}
          {state?.success && (
            <p className="text-green-600 text-xs font-medium" role="status">
              Contract PDF uploaded successfully.
            </p>
          )}

          <div className="flex gap-2 justify-end mt-1">
            <button
              type="button"
              onClick={() => setShowUploadForm(false)}
              disabled={isPending}
              className="button button--secondary py-1 px-3 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="button button--primary py-1 px-3 text-xs"
            >
              {isPending ? "Uploading..." : hasDocument ? "Upload & Replace" : "Upload Contract PDF"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
