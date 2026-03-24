import PDFDocument from "pdfkit";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { count, eq } from "drizzle-orm";

export async function generatePdfReport(): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Query stats
    const totalUsers = db.select({ count: count() }).from(schema.users).get()!.count;
    const totalPersonas = db.select({ count: count() }).from(schema.personas).get()!.count;
    const totalTargetRoles = db.select({ count: count() }).from(schema.targetRoles).get()!.count;
    const totalAssignments = db.select({ count: count() }).from(schema.userTargetRoleAssignments).get()!.count;
    const approved = db.select({ count: count() }).from(schema.userTargetRoleAssignments)
      .where(eq(schema.userTargetRoleAssignments.status, "approved")).get()!.count;
    const conflicts = db.select({ count: count() }).from(schema.sodConflicts).get()!.count;

    // Cover page
    doc.fontSize(24).font("Helvetica-Bold").text("AIRM — Role Mapping Audit Report", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).font("Helvetica").text(`Generated: ${new Date().toLocaleDateString()}`, { align: "center" });
    doc.moveDown(2);

    // Summary
    doc.fontSize(16).font("Helvetica-Bold").text("Project Summary");
    doc.moveDown(0.5);
    doc.fontSize(11).font("Helvetica");
    doc.text(`Total Users: ${totalUsers}`);
    doc.text(`Personas Generated: ${totalPersonas}`);
    doc.text(`Target Roles: ${totalTargetRoles}`);
    doc.text(`Total Role Assignments: ${totalAssignments}`);
    doc.text(`Approved Assignments: ${approved}`);
    doc.text(`Approval Rate: ${totalAssignments > 0 ? Math.round((approved / totalAssignments) * 100) : 0}%`);
    doc.text(`SOD Conflicts Detected: ${conflicts}`);
    doc.moveDown(2);

    // Department breakdown
    doc.fontSize(16).font("Helvetica-Bold").text("Department Breakdown");
    doc.moveDown(0.5);

    const deptStats = db.select({
      department: schema.users.department,
      userCount: count(),
    }).from(schema.users).groupBy(schema.users.department).all();

    doc.fontSize(11).font("Helvetica");
    for (const dept of deptStats) {
      doc.text(`${dept.department ?? "Unknown"}: ${dept.userCount} users`);
    }
    doc.moveDown(2);

    // Persona summary
    doc.fontSize(16).font("Helvetica-Bold").text("Persona Summary");
    doc.moveDown(0.5);

    const personas = db.select().from(schema.personas).all();
    doc.fontSize(11).font("Helvetica");
    for (const p of personas) {
      doc.text(`${p.name} — ${p.businessFunction ?? "General"} (${p.source})`);
    }
    doc.moveDown(2);

    // Risk assessment
    doc.fontSize(16).font("Helvetica-Bold").text("Risk Assessment");
    doc.moveDown(0.5);
    doc.fontSize(11).font("Helvetica");
    if (conflicts === 0) {
      doc.text("No SOD conflicts detected. Risk level: LOW.");
    } else {
      doc.text(`${conflicts} SOD conflict(s) detected across user assignments.`);
      const accepted = db.select({ count: count() }).from(schema.sodConflicts)
        .where(eq(schema.sodConflicts.resolutionStatus, "risk_accepted")).get()!.count;
      const open = db.select({ count: count() }).from(schema.sodConflicts)
        .where(eq(schema.sodConflicts.resolutionStatus, "open")).get()!.count;
      doc.text(`  Open: ${open}`);
      doc.text(`  Risk Accepted: ${accepted}`);
      doc.text(`  Risk Level: ${open > 0 ? "HIGH" : accepted > 0 ? "MEDIUM" : "LOW"}`);
    }

    doc.end();
  });
}
