"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  X,
  Download,
  Loader2,
  HelpCircle,
  FileCheck,
} from "lucide-react";
import { importParts, type ParsedPartInput, type ImportMode } from "./actions";

interface SpreadsheetImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SpreadsheetImportModal({
  isOpen,
  onClose,
  onSuccess,
}: SpreadsheetImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedPartInput[]>([]);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState<ImportMode>("upsert");
  const [importResult, setImportResult] = useState<{
    success: boolean;
    addedCount: number;
    updatedCount: number;
    skippedCount: number;
    errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  function resetState() {
    setFile(null);
    setParsedRows([]);
    setRawHeaders([]);
    setParseError(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleClose() {
    resetState();
    onClose();
  }

  function normalizeKey(str: string): string {
    return str
      .toLowerCase()
      .trim()
      .replace(/[\s_\-\/\(\)]+/g, "");
  }

  function handleFileSelected(selectedFile: File) {
    setParseError(null);
    setImportResult(null);

    const validExts = [".csv", ".xlsx", ".xls"];
    const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf(".")).toLowerCase();
    if (!validExts.includes(ext)) {
      setParseError("Please select a valid Excel (.xlsx, .xls) or CSV (.csv) file.");
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          throw new Error("No sheet found in workbook.");
        }
        const worksheet = workbook.Sheets[sheetName];
        const rawJson = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });

        if (!rawJson || rawJson.length === 0) {
          throw new Error("The selected file contains no data rows.");
        }

        const headers = Object.keys(rawJson[0]);
        setRawHeaders(headers);

        const mappedParts: ParsedPartInput[] = rawJson.map((row) => {
          const rowNorm: Record<string, unknown> = {};
          Object.entries(row).forEach(([k, v]) => {
            rowNorm[normalizeKey(k)] = v;
          });

          // Smart match fields
          const name =
            String(
              rowNorm["partname"] ||
              rowNorm["name"] ||
              rowNorm["item"] ||
              rowNorm["itemname"] ||
              rowNorm["description"] ||
              ""
            ).trim();

          const part_number =
            String(
              rowNorm["partnumber"] ||
              rowNorm["partno"] ||
              rowNorm["partnum"] ||
              rowNorm["part#"] ||
              rowNorm["pn"] ||
              rowNorm["sku"] ||
              ""
            ).trim() || null;

          const sku =
            String(
              rowNorm["sku"] ||
              rowNorm["partnumber"] ||
              rowNorm["partno"] ||
              rowNorm["itemcode"] ||
              rowNorm["barcode"] ||
              ""
            ).trim() || part_number;

          const category =
            String(
              rowNorm["category"] ||
              rowNorm["type"] ||
              rowNorm["group"] ||
              "General"
            ).trim();

          const compatible_model =
            String(
              rowNorm["compatiblemodel"] ||
              rowNorm["model"] ||
              rowNorm["bikemodel"] ||
              rowNorm["compatibility"] ||
              ""
            ).trim() || null;

          const stock_quantity = Math.max(
            0,
            Math.floor(
              Number(
                rowNorm["stockquantity"] ??
                rowNorm["quantity"] ??
                rowNorm["qty"] ??
                rowNorm["stock"] ??
                rowNorm["qtyinstock"] ??
                rowNorm["count"] ??
                0
              )
            )
          );

          const minimum_stock_level = Math.max(
            0,
            Math.floor(
              Number(
                rowNorm["minimumstocklevel"] ??
                rowNorm["minstock"] ??
                rowNorm["minlevel"] ??
                rowNorm["reorderlevel"] ??
                rowNorm["threshold"] ??
                5
              )
            )
          );

          const rawPrice =
            rowNorm["unitprice"] ??
            rowNorm["unitpricezar"] ??
            rowNorm["price"] ??
            rowNorm["pricezar"] ??
            rowNorm["cost"] ??
            rowNorm["rate"];
          const unit_price =
            rawPrice !== undefined && rawPrice !== "" && !isNaN(Number(rawPrice))
              ? Number(rawPrice)
              : null;

          const storage_location =
            String(
              rowNorm["storagelocation"] ||
              rowNorm["location"] ||
              rowNorm["bin"] ||
              rowNorm["shelf"] ||
              rowNorm["warehouse"] ||
              ""
            ).trim() || null;

          const supplier =
            String(
              rowNorm["supplier"] ||
              rowNorm["vendor"] ||
              rowNorm["brand"] ||
              ""
            ).trim() || null;

          const notes =
            String(
              rowNorm["notes"] ||
              rowNorm["comments"] ||
              rowNorm["specs"] ||
              rowNorm["remarks"] ||
              ""
            ).trim() || null;

          return {
            name,
            part_number,
            sku,
            category,
            compatible_model,
            stock_quantity,
            minimum_stock_level,
            unit_price,
            storage_location,
            supplier,
            notes,
          };
        });

        // Filter out completely blank rows
        const validParts = mappedParts.filter((p) => p.name.length > 0);
        if (validParts.length === 0) {
          throw new Error("Could not find any rows with a valid Part Name. Please check column headers.");
        }

        setParsedRows(validParts);
      } catch (err) {
        setParseError(err instanceof Error ? err.message : "Failed to read file.");
      }
    };

    reader.onerror = () => {
      setParseError("File reading failed. Please try again.");
    };

    reader.readAsArrayBuffer(selectedFile);
  }

  function downloadTemplate(format: "csv" | "xlsx") {
    const sampleRows = [
      {
        "Part Name": "Front Brake Pad Set (OEM)",
        "Part Number": "H-BRK-150-F",
        "SKU": "H-BRK-150-F",
        "Category": "Brakes",
        "Compatible Model": "HERO Hunter 150 / ECO 150",
        "Stock Quantity": 25,
        "Minimum Stock Level": 10,
        "Unit Price (ZAR)": 185.0,
        "Storage Location": "Bin A-12, Main Depot",
        "Supplier": "Hero MotoCorp SA",
        "Notes": "Genuine ceramic composite compound",
      },
      {
        "Part Name": "Engine Oil 20W-50 4T (1L)",
        "Part Number": "H-OIL-20W50-1L",
        "SKU": "H-OIL-20W50-1L",
        "Category": "Fluids & Filters",
        "Compatible Model": "All Hero 150cc Fleet",
        "Stock Quantity": 60,
        "Minimum Stock Level": 20,
        "Unit Price (ZAR)": 120.0,
        "Storage Location": "Shelf F-01, Fluids Bay",
        "Supplier": "Castrol / Hero OEM",
        "Notes": "Replace every 3,000 km",
      },
      {
        "Part Name": "Heavy Duty Drive Chain 428-120L",
        "Part Number": "H-CHN-428-120",
        "SKU": "H-CHN-428-120",
        "Category": "Drive & Chain",
        "Compatible Model": "HERO Hunter 150",
        "Stock Quantity": 16,
        "Minimum Stock Level": 6,
        "Unit Price (ZAR)": 240.0,
        "Storage Location": "Bin C-04",
        "Supplier": "DID / Hero OEM",
        "Notes": "Includes connecting master link",
      },
      {
        "Part Name": "Spark Plug CPR8EA-9",
        "Part Number": "H-SPK-CPR8EA",
        "SKU": "H-SPK-CPR8EA",
        "Category": "Electrical",
        "Compatible Model": "HERO Eco 150 / Hunter 150",
        "Stock Quantity": 40,
        "Minimum Stock Level": 15,
        "Unit Price (ZAR)": 65.0,
        "Storage Location": "Drawer E-02",
        "Supplier": "NGK Spark Plugs SA",
        "Notes": "Standard 0.9mm gap",
      },
      {
        "Part Name": "Tubeless Rear Tyre 100/90-18",
        "Part Number": "H-TYR-100-90-18",
        "SKU": "H-TYR-100-90-18",
        "Category": "Tyres & Wheels",
        "Compatible Model": "HERO Hunter 150",
        "Stock Quantity": 12,
        "Minimum Stock Level": 4,
        "Unit Price (ZAR)": 750.0,
        "Storage Location": "Tyre Rack T-01",
        "Supplier": "MRF / CEAT",
        "Notes": "All-weather urban tread pattern",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows);
    // Set column widths for comfortable editing
    worksheet["!cols"] = [
      { wch: 32 }, // Part Name
      { wch: 18 }, // Part Number
      { wch: 18 }, // SKU
      { wch: 16 }, // Category
      { wch: 26 }, // Compatible Model
      { wch: 15 }, // Stock Quantity
      { wch: 18 }, // Min Level
      { wch: 16 }, // Unit Price
      { wch: 22 }, // Location
      { wch: 20 }, // Supplier
      { wch: 34 }, // Notes
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Parts Catalogue");

    if (format === "csv") {
      XLSX.writeFile(workbook, "vmc_hero_parts_template.csv", { bookType: "csv" });
    } else {
      XLSX.writeFile(workbook, "vmc_hero_parts_template.xlsx", { bookType: "xlsx" });
    }
  }

  async function handleExecuteImport() {
    if (!parsedRows || parsedRows.length === 0) return;
    setIsProcessing(true);
    setParseError(null);

    try {
      const res = await importParts(parsedRows, mode, file?.name || "spreadsheet_upload");
      if (res.error) {
        setParseError(res.error);
      } else {
        setImportResult({
          success: true,
          addedCount: res.addedCount ?? 0,
          updatedCount: res.updatedCount ?? 0,
          skippedCount: res.skippedCount ?? 0,
          errors: res.errors ?? [],
        });
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Failed to import parts.");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-2xl border border-line flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-line bg-surface/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-md bg-blue-50 text-blue-600">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-navy m-0">Upload Parts Spreadsheet</h2>
              <p className="text-xs text-muted m-0">
                Bulk import parts catalogue and stock quantities via Excel (.xlsx) or CSV (.csv)
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-muted hover:text-navy rounded-md hover:bg-black/5"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 space-y-5">
          {/* Download Templates Banner */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-md flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-navy">
              <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Need a pre-formatted template with all columns and Hero bike examples?
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => downloadTemplate("xlsx")}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-blue-300 rounded font-semibold text-blue-700 hover:bg-blue-100/50 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                Excel Template (.xlsx)
              </button>
              <button
                type="button"
                onClick={() => downloadTemplate("csv")}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-blue-300 rounded font-semibold text-blue-700 hover:bg-blue-100/50 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                CSV Template (.csv)
              </button>
            </div>
          </div>

          {/* Success Screen */}
          {importResult && (
            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 space-y-3">
              <div className="flex items-center gap-2.5 font-bold text-base text-emerald-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Spreadsheet successfully processed!</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center my-3">
                <div className="bg-white p-3 rounded border border-emerald-200 shadow-xs">
                  <div className="text-2xl font-bold text-emerald-700">{importResult.addedCount}</div>
                  <div className="text-xs text-muted">New Parts Added</div>
                </div>
                <div className="bg-white p-3 rounded border border-emerald-200 shadow-xs">
                  <div className="text-2xl font-bold text-blue-700">{importResult.updatedCount}</div>
                  <div className="text-xs text-muted">Stock / Parts Updated</div>
                </div>
                <div className="bg-white p-3 rounded border border-emerald-200 shadow-xs">
                  <div className="text-2xl font-bold text-gray-700">{importResult.skippedCount}</div>
                  <div className="text-xs text-muted">Skipped / Duplicates</div>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 max-h-32 overflow-y-auto">
                  <p className="font-semibold mb-1">Warnings / Row notices:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {importResult.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleClose}
                  className="button button--primary !py-1.5 !px-4 !text-sm"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {parseError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Dropzone if no file or preview */}
          {!importResult && !parsedRows.length && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileSelected(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-line hover:border-blue-500 rounded-lg p-8 text-center cursor-pointer transition-colors bg-surface/30 hover:bg-blue-50/20"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelected(e.target.files[0]);
                  }
                }}
              />
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-navy text-sm mb-1">
                Drop your parts spreadsheet here or click to browse
              </h3>
              <p className="text-xs text-muted max-w-sm mx-auto">
                Supports Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv).
                Column headers are automatically mapped.
              </p>
            </div>
          )}

          {/* Parsed Preview Section */}
          {!importResult && parsedRows.length > 0 && (
            <div className="space-y-4">
              {/* File Info Bar */}
              <div className="flex items-center justify-between p-3 bg-surface border border-line rounded-md text-xs">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-navy">{file?.name}</span>
                  <span className="text-muted">({(Number(file?.size || 0) / 1024).toFixed(1)} KB)</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {parsedRows.length} valid parts detected
                  </span>
                  <button
                    type="button"
                    onClick={resetState}
                    className="text-xs text-muted hover:text-red-600 underline"
                  >
                    Change file
                  </button>
                </div>
              </div>

              {/* Import Mode Selector */}
              <div className="p-3 bg-surface/40 border border-line rounded-md space-y-2">
                <label className="text-xs font-bold text-navy block">Import & Stock Update Mode:</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label
                    className={`flex items-start gap-2 p-2.5 rounded border cursor-pointer text-xs ${
                      mode === "upsert"
                        ? "bg-blue-50/80 border-blue-500 font-semibold text-navy"
                        : "bg-white border-line text-muted hover:bg-surface"
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      value="upsert"
                      checked={mode === "upsert"}
                      onChange={() => setMode("upsert")}
                      className="mt-0.5 text-blue-600"
                    />
                    <div>
                      <div className="text-navy font-bold">Sync & Set Stock</div>
                      <div className="text-[11px] text-muted font-normal">
                        Matches by SKU/Name. Sets stock to spreadsheet count and updates details.
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2 p-2.5 rounded border cursor-pointer text-xs ${
                      mode === "add_stock"
                        ? "bg-blue-50/80 border-blue-500 font-semibold text-navy"
                        : "bg-white border-line text-muted hover:bg-surface"
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      value="add_stock"
                      checked={mode === "add_stock"}
                      onChange={() => setMode("add_stock")}
                      className="mt-0.5 text-blue-600"
                    />
                    <div>
                      <div className="text-navy font-bold">Add to Stock (+Qty)</div>
                      <div className="text-[11px] text-muted font-normal">
                        Adds spreadsheet quantity to current warehouse stock. New parts inserted.
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2 p-2.5 rounded border cursor-pointer text-xs ${
                      mode === "new_only"
                        ? "bg-blue-50/80 border-blue-500 font-semibold text-navy"
                        : "bg-white border-line text-muted hover:bg-surface"
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      value="new_only"
                      checked={mode === "new_only"}
                      onChange={() => setMode("new_only")}
                      className="mt-0.5 text-blue-600"
                    />
                    <div>
                      <div className="text-navy font-bold">New Parts Only</div>
                      <div className="text-[11px] text-muted font-normal">
                        Only imports new SKUs. Existing parts are left untouched.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Data Preview Table */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-navy">
                    Data Preview (Showing first {Math.min(5, parsedRows.length)} of {parsedRows.length} parts)
                  </span>
                  <span className="text-[11px] text-muted">
                    Headers mapped: {rawHeaders.slice(0, 4).join(", ")}
                    {rawHeaders.length > 4 ? ` +${rawHeaders.length - 4} more` : ""}
                  </span>
                </div>
                <div className="border border-line rounded-md overflow-x-auto max-h-48 bg-white">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-surface/80 text-muted uppercase text-[10px] font-bold border-b border-line sticky top-0">
                      <tr>
                        <th className="p-2">Part Name</th>
                        <th className="p-2">SKU / Number</th>
                        <th className="p-2">Category</th>
                        <th className="p-2">Compatible Model</th>
                        <th className="p-2 text-right">Stock</th>
                        <th className="p-2 text-right">Min Level</th>
                        <th className="p-2 text-right">Price (ZAR)</th>
                        <th className="p-2">Location</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {parsedRows.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="hover:bg-surface/40">
                          <td className="p-2 font-semibold text-navy">{row.name}</td>
                          <td className="p-2 font-mono text-[11px] text-muted">
                            {row.sku || row.part_number || "—"}
                          </td>
                          <td className="p-2">{row.category}</td>
                          <td className="p-2 text-muted">{row.compatible_model || "All"}</td>
                          <td className="p-2 text-right font-bold text-navy">
                            {row.stock_quantity ?? 0}
                          </td>
                          <td className="p-2 text-right text-muted">
                            {row.minimum_stock_level ?? 5}
                          </td>
                          <td className="p-2 text-right font-mono">
                            {row.unit_price != null ? `R ${row.unit_price.toFixed(2)}` : "—"}
                          </td>
                          <td className="p-2 text-muted">{row.storage_location || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 border-t border-line bg-surface/50">
          <button
            type="button"
            onClick={handleClose}
            disabled={isProcessing}
            className="button button--light !py-1.5 !px-3.5 !text-xs font-semibold"
          >
            Cancel
          </button>

          {!importResult && parsedRows.length > 0 && (
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={isProcessing}
              className="button button--primary !py-1.5 !px-4 !text-xs font-bold inline-flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing {parsedRows.length} parts...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm & Import {parsedRows.length} Parts
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
