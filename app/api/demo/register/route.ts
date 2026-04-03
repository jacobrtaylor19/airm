import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { sendNotificationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, company, role } = body;

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    // Insert lead into database
    await db.insert(schema.demoLeads).values({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      company: company?.trim() || null,
      role: role?.trim() || null,
      source: "demo_overview",
    });

    // Fire-and-forget email notification to Jacob
    sendNotificationEmail(
      "jacob@provisum.io",
      "New Demo Lead",
      `<strong>${name.trim()}</strong> (${email.trim()}) just registered for the Provisum demo.` +
        (company ? `<br/><strong>Company:</strong> ${company.trim()}` : "") +
        (role ? `<br/><strong>Role:</strong> ${role.trim()}` : ""),
      "/admin"
    ).catch(() => {
      // Swallow — email is best-effort
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[demo/register] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
