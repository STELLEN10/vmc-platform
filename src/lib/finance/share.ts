export interface ShareableLineItem {
  description: string;
  quantity: number;
  unitPrice?: number;
  total?: number;
  totalPrice?: number;
}

export interface ShareableDoc {
  type: string; // 'invoice' | 'quotation' | 'receipt'
  docNumber: string;
  recipientName: string;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  bikeReference?: string | null;
  issueDate: string;
  dueDate?: string | null;
  items: ShareableLineItem[];
  subtotal: number;
  vatAmount?: number;
  totalAmount: number;
  notes?: string | null;
  paymentInstructions?: string | null;
  corridor?: string | null;
}

export const OFFICIAL_BANK_DETAILS = {
  bankName: "Capitec",
  accountHolder: "VS Procurement",
  accountNumber: "10976145",
  accountType: "Business Account",
  branchCode: "25854",
  phone: "+27 76 668 1879",
  email: "info@vsprocurement.co.za",
} as const;

export const OFFICIAL_BANKING_TEXT = 
`Bank Name: ${OFFICIAL_BANK_DETAILS.bankName}
Account Holder: ${OFFICIAL_BANK_DETAILS.accountHolder}
Account No: ${OFFICIAL_BANK_DETAILS.accountNumber}
Account Type: ${OFFICIAL_BANK_DETAILS.accountType}
Branch Code: ${OFFICIAL_BANK_DETAILS.branchCode}`;

/**
 * Builds clean, professional WhatsApp text with reliable formatting,
 * Pretoria to Midrand corridor, clear dividers, and zero corrupt characters.
 */
export function buildWhatsAppMessage(doc: ShareableDoc): string {
  const isQuo = doc.type.toLowerCase().includes("quot");
  const docTitle = isQuo ? "OFFICIAL QUOTATION" : "TAX INVOICE";
  const corridor = doc.corridor || "Pretoria to Midrand Fleet Operations";

  const formattedItems = doc.items.map((it, idx) => {
    const amount = Number(it.totalPrice ?? it.total ?? 0).toFixed(2);
    return `${idx + 1}. *${it.description}* (x${it.quantity}) - *R ${amount}*`;
  }).join("\n");

  const lines: (string | null)[] = [
    `*VS PROCUREMENT / VALHALLA MOTORCYCLES*`,
    `*${corridor}*`,
    `────────────────────────────`,
    `*${docTitle}:* *${doc.docNumber}*`,
    ``,
    `*Client / Driver:* ${doc.recipientName}`,
    doc.recipientPhone ? `*Contact:* ${doc.recipientPhone}` : null,
    doc.bikeReference ? `*Motorcycle:* ${doc.bikeReference}` : null,
    `*Date Issued:* ${doc.issueDate}${doc.dueDate ? ` | *Due:* ${doc.dueDate}` : ""}`,
    ``,
    `*SCHEDULE OF CHARGES / ITEMS:*`,
    formattedItems,
    ``,
    `*TOTAL ${isQuo ? "QUOTED" : "DUE"}:* *R ${Number(doc.totalAmount).toFixed(2)}*`,
    `────────────────────────────`,
    `*OFFICIAL BANKING DETAILS (EFT):*`,
    `• *Bank Name:* ${OFFICIAL_BANK_DETAILS.bankName}`,
    `• *Account Holder:* ${OFFICIAL_BANK_DETAILS.accountHolder}`,
    `• *Account No:* ${OFFICIAL_BANK_DETAILS.accountNumber}`,
    `• *Account Type:* ${OFFICIAL_BANK_DETAILS.accountType}`,
    `• *Branch Code:* ${OFFICIAL_BANK_DETAILS.branchCode}`,
    `• *Reference:* ${doc.docNumber}`,
    ``,
    doc.notes ? `*Notes:* ${doc.notes}\n` : null,
    `*Enquiries / WhatsApp:* ${OFFICIAL_BANK_DETAILS.phone}`,
    `*Email:* ${OFFICIAL_BANK_DETAILS.email}`,
    `────────────────────────────`,
  ];

  return lines.filter((l) => l !== null).join("\n");
}

/**
 * Generate a WhatsApp share URL. If a recipient phone is passed, target them directly.
 * Otherwise open general WhatsApp share dialogue.
 */
export function getWhatsAppShareUrl(doc: ShareableDoc, targetPhone?: string | null): string {
  const message = buildWhatsAppMessage(doc);
  const encodedText = encodeURIComponent(message);

  if (targetPhone) {
    const cleanPhone = targetPhone.replace(/[^0-9]/g, "");
    if (cleanPhone.length >= 9) {
      // If starts with 0 and 10 digits (SA standard 076...), replace 0 with 27
      const international = cleanPhone.startsWith("0") && cleanPhone.length === 10
        ? `27${cleanPhone.slice(1)}`
        : cleanPhone;
      return `https://wa.me/${international}?text=${encodedText}`;
    }
  }

  return `https://api.whatsapp.com/send?text=${encodedText}`;
}

/**
 * Builds email subject and prefilled body for mailto:
 */
export function buildEmailContent(doc: ShareableDoc): { subject: string; body: string } {
  const isQuo = doc.type.toLowerCase().includes("quot");
  const docTitle = isQuo ? "Official Quotation" : "Tax Invoice";

  const subject = `[${docTitle}] ${doc.docNumber} - VS Procurement / Valhalla Motorcycles`;

  const lines = [
    `Dear ${doc.recipientName},`,
    ``,
    `Please find below the schedule and payment details for your ${docTitle} (${doc.docNumber}).`,
    ``,
    `DOCUMENT SUMMARY:`,
    `• Document Number: ${doc.docNumber}`,
    `• Document Type: ${docTitle}`,
    `• Date Issued: ${doc.issueDate}`,
    doc.dueDate ? `• Payment Due / Validity: ${doc.dueDate}` : null,
    doc.bikeReference ? `• Assigned Motorcycle: ${doc.bikeReference}` : null,
    ``,
    `LINE ITEMS:`,
    ...doc.items.map((it, idx) => {
      const amount = Number(it.totalPrice ?? it.total ?? 0).toFixed(2);
      return `  ${idx + 1}. ${it.description} (Qty: ${it.quantity}) — R ${amount}`;
    }),
    ``,
    `Subtotal: R ${Number(doc.subtotal).toFixed(2)}`,
    doc.vatAmount ? `VAT (15%): R ${Number(doc.vatAmount).toFixed(2)}` : null,
    `TOTAL ${isQuo ? "QUOTED" : "DUE"}: R ${Number(doc.totalAmount).toFixed(2)}`,
    ``,
    `OFFICIAL BANKING DETAILS (EFT):`,
    `Bank Name: ${OFFICIAL_BANK_DETAILS.bankName}`,
    `Account Holder: ${OFFICIAL_BANK_DETAILS.accountHolder}`,
    `Account No: ${OFFICIAL_BANK_DETAILS.accountNumber}`,
    `Account Type: ${OFFICIAL_BANK_DETAILS.accountType}`,
    `Branch Code: ${OFFICIAL_BANK_DETAILS.branchCode}`,
    `Payment Reference: ${doc.docNumber}`,
    ``,
    doc.notes ? `Terms & Notes:\n${doc.notes}\n` : null,
    `For any billing enquiries or proof of payment submissions:`,
    `Telephone / WhatsApp: ${OFFICIAL_BANK_DETAILS.phone}`,
    `Email: ${OFFICIAL_BANK_DETAILS.email}`,
    ``,
    `Kind regards,`,
    `VS Procurement & Valhalla Motorcycles Operations Desk`,
  ];

  const body = lines.filter((l) => l !== null).join("\n");
  return { subject, body };
}

/**
 * Generates mailto URL with prefilled recipient, subject, and body
 */
export function getEmailShareUrl(doc: ShareableDoc, targetEmail?: string | null): string {
  const { subject, body } = buildEmailContent(doc);
  const to = targetEmail || doc.recipientEmail || "";
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
