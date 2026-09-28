import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt = "", context = {} } = body;
    const { pathname = "", role = "driver", driverName = "Driver", bikeInfo = "" } = context;

    // Build operational system instruction
    const systemInstruction = `You are the official VMC AI Assistant for Valhalla Motorcycles (VMC) fleet operations in South Africa.
Your mission is to provide prompt, calm, professional, and actionable fleet assistance to motorcycle delivery riders and operations staff.
You are aware of the user's current context:
- Role: ${role}
- User/Driver: ${driverName}
- Assigned Motorcycle: ${bikeInfo || "Standard Hero Eco 150"}
- Active Screen: ${pathname}

OPERATIONAL SPECIALTIES:
1. Roadside Emergency & Accident Support: Prioritize rider safety, clear road protocol, emergency dispatch templates, police / towing readiness.
2. Motorcycle Maintenance & Fault Logging: Mechanical diagnosis, wear-and-tear guidance for Hero motorcycles, service scheduling.
3. Billing & Invoices: Quotation templates, weekly rent receipts, payment proof verification in South African Rands (ZAR / R).

CRITICAL FORMATTING RULES:
- NEVER use asterisks or markdown stars for bolding or bullet points. DO NOT use **bold** or *list*.
- Format all responses using clean plain text with CAPITALIZED HEADINGS, clean line breaks, and clear numbered lists (1., 2., 3.) or clean bullet symbols (•).
- Keep responses clean, professional, empathetic, and scannable on mobile phones.`;

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            systemInstruction,
            temperature: 0.3,
          },
        });

        let text = response.text || "";
        // Strip any accidental markdown stars
        text = cleanText(text);

        return NextResponse.json({ text });
      } catch (geminiError) {
        console.error("Gemini API call error:", geminiError);
        // Fall back to rule-based professional template engine
      }
    }

    // Professional Fallback Template Engine (100% resilient with zero stars)
    const text = generateFallbackResponse(prompt, pathname, driverName, bikeInfo);
    return NextResponse.json({ text: cleanText(text) });
  } catch (error) {
    console.error("VMC AI API error:", error);
    return NextResponse.json(
      {
        text: "VMC AI is temporarily reconnecting. Please check your emergency desk or notify fleet dispatch immediately.",
      },
      { status: 200 }
    );
  }
}

function cleanText(input: string): string {
  if (!input) return "";
  return input
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/_{2,}/g, "")
    .replace(/#/g, "")
    .trim();
}

function generateFallbackResponse(prompt: string, pathname: string, driverName: string, bikeInfo: string): string {
  const p = prompt.toLowerCase();

  if (p.includes("emergency") || p.includes("breakdown") || p.includes("puncture") || p.includes("accident") || pathname.includes("emergency")) {
    if (p.includes("accident") || p.includes("crash") || p.includes("hit")) {
      return `ACCIDENT INCIDENT PROTOCOL
Rider: ${driverName}
Assigned Motorcycle: ${bikeInfo || "Hero Eco 150"}

STEP 1 · IMMEDIATE SAFETY
1. Move yourself to a safe spot off the road away from traffic.
2. If anyone is injured, call Emergency Medical Services on 112 or 10177 immediately.
3. Turn motorcycle ignition OFF and activate hazard lights if possible.

STEP 2 · INCIDENT DETAILS TEMPLATE
• Location: Specify street name, nearest intersection, and city.
• Third Party Involved: Take vehicle registration number and driver contact.
• Bike Condition: State if motorcycle can be safely ridden or requires flatbed towing.
• Photos: Capture clear photos of damage, road scene, and third-party license disk.

STEP 3 · DISPATCH DESK LOG
Submit the Emergency Assistance form right here on your screen with severity set to CRITICAL. VMC Operations will be notified immediately for on-site support.`;
    }

    return `ROADSIDE BREAKDOWN & DISPATCH TEMPLATE
Rider: ${driverName}
Assigned Motorcycle: ${bikeInfo || "Hero Eco 150"}

STATUS: Mechanical Support Request
If you are stranded on the road, follow this verified VMC dispatch protocol:

STEP 1 · SAFETY FIRST
1. Position motorcycle on the verge or shoulder out of passing traffic.
2. Keep helmet and reflective vest on for visibility.

STEP 2 · BREAKDOWN DETAILS TEMPLATE
• Issue: Puncture / Engine cut-out / Chain drop / Battery dead
• Exact Location: Street name and landmark (e.g. M1 North near Grayston off-ramp)
• Current Tyre / Bike Status: Wheel immobilized or engine non-starting
• Roadside Assistance Needed: Mobile Technician / Field Tyre Repair / Towing

STEP 3 · FAST DISPATCH
Click the 'Open Emergency Desk' button or submit the emergency report on this page. VMC field coordinators monitor incoming tickets live.`;
  }

  if (p.includes("invoice") || p.includes("quotation") || p.includes("quote") || p.includes("receipt") || pathname.includes("payments")) {
    return `VALHALLA MOTORCYCLES · BILLING & QUOTATION TEMPLATE

DOCUMENT TYPE: Official Quotation / Tax Invoice
ISSUED BY: Valhalla Motorcycles (Pty) Ltd

CLIENT / RECIPIENT:
Driver: ${driverName}
Vehicle Reference: ${bikeInfo || "Hero Eco 150"}
Payment Frequency: Weekly Rent-to-Own Cycle

SCHEDULE OF CHARGES (ZAR):
1. Weekly Motorcycle Rental (Hero Eco 150): R500.00
2. Comprehensive Tracking & Maintenance Levy: R120.00
3. Fleet Delivery Top Box & Mounting Bracket: R85.00
• Subtotal: R705.00
• Total Due: R705.00

PAYMENT DETAILS:
Bank: Standard Bank
Account Name: Valhalla Motorcycles (Pty) Ltd
Reference: Use your Driver ID or Invoice Number
Proof Submission: Upload payment slip under Payments > Upload Proof.`;
  }

  if (p.includes("maintenance") || p.includes("oil") || p.includes("brake") || p.includes("service") || pathname.includes("maintenance")) {
    return `VMC MAINTENANCE LOG TEMPLATE
Rider: ${driverName}
Motorcycle: ${bikeInfo || "Hero Eco 150"}

MAINTENANCE GUIDELINES:
1. Oil Change: Due every 3,000 km to protect engine lifespan.
2. Brake Inspection: Inspect front disc pad wear and rear drum tension weekly.
3. Drive Chain: Check 25mm slack and lubricate daily before delivery shifts.

HOW TO LOG THIS ISSUE:
• Open the Maintenance tab in your menu.
• Select the affected part (e.g. Brakes, Tyres, Electrical, Engine).
• Attach a short description or photo if safe to do so.
• VMC workshop technicians will approve and assign an authorized service bay.`;
  }

  return `VMC FLEET ASSISTANT
Welcome ${driverName}. I am your dedicated operational assistant for Valhalla Motorcycles.

HOW CAN I ASSIST YOU TODAY?
1. Roadside Emergency: Say "I have a breakdown" or "Report accident" for immediate templates and safety guidance.
2. Maintenance Desk: Ask for brake, chain, tyre, or scheduled oil service assistance.
3. Invoices & Payments: Inquire about weekly rental receipts, quotations, or banking details.

Simply type your question or select one of the quick templates above.`;
}
