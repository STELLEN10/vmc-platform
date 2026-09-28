export interface QuotationItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface BankingDetails {
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  accountType: string;
  branchCode: string;
  reference: string;
}

export interface Quotation {
  id: string;
  clientName: string;
  contactNumber: string;
  motorcycleReg: string;
  motorcycleModel?: string;
  dateIssued: string;
  dueDate: string;
  corridor: string;
  status: "pending" | "paid" | "overdue" | "cancelled";
  items: QuotationItem[];
  totalAmount: number;
  bankingDetails: BankingDetails;
  enquiriesPhone: string;
  enquiriesEmail: string;
  notes?: string;
  createdAt: string;
}

export const DEFAULT_BANKING_DETAILS: BankingDetails = {
  bankName: "Capitec",
  accountHolder: "VS Procurement",
  accountNumber: "10976145",
  accountType: "Business Account",
  branchCode: "25854",
  reference: "QUO-2026-001",
};

export const INITIAL_QUOTATIONS: Quotation[] = [
  {
    id: "QUO-2026-001",
    clientName: "Lameck",
    contactNumber: "+27785206862",
    motorcycleReg: "rsuC31ZJGP",
    motorcycleModel: "HERO Eco 150",
    dateIssued: "2026-09-28",
    dueDate: "2026-10-05",
    corridor: "Pretoria to Midrand",
    status: "pending",
    items: [
      {
        id: "item-1",
        description: "Tyre Front",
        quantity: 1,
        unitPrice: 436.58,
        total: 436.58,
      },
    ],
    totalAmount: 436.58,
    bankingDetails: {
      bankName: "Capitec",
      accountHolder: "VS Procurement",
      accountNumber: "10976145",
      accountType: "Business Account",
      branchCode: "25854",
      reference: "QUO-2026-001",
    },
    enquiriesPhone: "+27 76 668 1879",
    enquiriesEmail: "info@vsprocurement.co.za",
    notes: "Official replacement tyre quotation for HERO delivery motorcycle. Payment confirms warehouse release and fitment slot.",
    createdAt: "2026-09-28T09:00:00Z",
  },
];

/**
 * Generates the clean, beautifully structured WhatsApp quotation message.
 * Formatted with bold highlights, clean dividers, proper WhatsApp markdown, and no corrupt characters.
 */
export function generateCleanWhatsAppMessage(quote: Quotation): string {
  const itemsText = quote.items
    .map(
      (item, idx) =>
        `${idx + 1}. *${item.description}* (x${item.quantity}) - *R ${item.total.toFixed(2)}*`
    )
    .join("\n");

  return `*VS PROCUREMENT / VALHALLA MOTORCYCLES*
*${quote.corridor || "Pretoria to Midrand Fleet Operations"}*
────────────────────────────
*OFFICIAL QUOTATION: ${quote.id}*

*Client / Driver:* ${quote.clientName}
*Contact:* ${quote.contactNumber}
*Motorcycle:* ${quote.motorcycleReg}${quote.motorcycleModel ? ` (${quote.motorcycleModel})` : ""}
*Date Issued:* ${quote.dateIssued} | *Due:* ${quote.dueDate}

*SCHEDULE OF CHARGES / ITEMS:*
${itemsText}

*TOTAL QUOTED:* *R ${quote.totalAmount.toFixed(2)}*
────────────────────────────
*OFFICIAL BANKING DETAILS (EFT):*
• *Bank Name:* ${quote.bankingDetails.bankName}
• *Account Holder:* ${quote.bankingDetails.accountHolder}
• *Account No:* ${quote.bankingDetails.accountNumber}
• *Account Type:* ${quote.bankingDetails.accountType}
• *Branch Code:* ${quote.bankingDetails.branchCode}
• *Reference:* ${quote.bankingDetails.reference}

*Enquiries / WhatsApp:* ${quote.enquiriesPhone}
*Email:* ${quote.enquiriesEmail}
────────────────────────────`;
}

/**
 * Generates a clean plain-text version without markdown asterisks (ideal for SMS or standard email).
 */
export function generateCleanPlainTextMessage(quote: Quotation): string {
  const itemsText = quote.items
    .map(
      (item, idx) =>
        `${idx + 1}. ${item.description} (x${item.quantity}) - R ${item.total.toFixed(2)}`
    )
    .join("\n");

  return `========================================
VS PROCUREMENT / VALHALLA MOTORCYCLES
${quote.corridor || "Pretoria to Midrand Fleet Operations"}
========================================

OFFICIAL QUOTATION: ${quote.id}

Client / Driver: ${quote.clientName}
Contact: ${quote.contactNumber}
Motorcycle: ${quote.motorcycleReg}${quote.motorcycleModel ? ` (${quote.motorcycleModel})` : ""}
Date Issued: ${quote.dateIssued} | Due: ${quote.dueDate}

----------------------------------------
SCHEDULE OF CHARGES / ITEMS:
${itemsText}

TOTAL QUOTED: R ${quote.totalAmount.toFixed(2)}
----------------------------------------

OFFICIAL BANKING DETAILS (EFT):
• Bank Name: ${quote.bankingDetails.bankName}
• Account Holder: ${quote.bankingDetails.accountHolder}
• Account No: ${quote.bankingDetails.accountNumber}
• Account Type: ${quote.bankingDetails.accountType}
• Branch Code: ${quote.bankingDetails.branchCode}
• Reference: ${quote.bankingDetails.reference}

----------------------------------------
Enquiries / WhatsApp: ${quote.enquiriesPhone}
Email: ${quote.enquiriesEmail}
========================================`;
}

/**
 * Builds direct WhatsApp URL with phone number and pre-filled clean message
 */
export function getWhatsAppUrl(phone: string, message: string): string {
  // Clean phone number: remove spaces, plus, hyphens
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
