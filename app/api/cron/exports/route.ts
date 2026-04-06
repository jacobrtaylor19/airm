import { NextRequest, NextResponse } from "next/server";
import { getDueExports, markExportCompleted } from "@/lib/scheduled-exports";
import { reportError, reportMessage } from "@/lib/monitoring";

export const dynamic = "force-dynamic";

// Vercel cron jobs call this endpoint
export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dueExports = await getDueExports();

    if (dueExports.length === 0) {
      return NextResponse.json({ message: "No exports due", processed: 0 });
    }

    reportMessage(`Processing ${dueExports.length} scheduled exports`, "info");

    const results: { id: number; name: string; status: string }[] = [];

    for (const exp of dueExports) {
      try {
        // For now, log the export. In production, this would call the appropriate
        // export handler and store the result (e.g., upload to Vercel Blob)
        reportMessage(`Running scheduled export: ${exp.name} (${exp.exportType})`, "info", {
          exportId: exp.id,
          exportType: exp.exportType,
        });

        // Mark as completed for now — actual export execution would go here
        await markExportCompleted(exp.id, "success");
        results.push({ id: exp.id, name: exp.name, status: "success" });
      } catch (err) {
        await markExportCompleted(exp.id, "failed", String(err));
        results.push({ id: exp.id, name: exp.name, status: "failed" });
        reportError(err, { context: "scheduled-export", exportId: exp.id });
      }
    }

    return NextResponse.json({ processed: results.length, results });
  } catch (err) {
    reportError(err, { route: "GET /api/cron/exports" });
    return NextResponse.json({ error: "Failed to process exports" }, { status: 500 });
  }
}
