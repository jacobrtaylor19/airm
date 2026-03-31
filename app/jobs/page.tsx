import { getJobs, getDashboardStats } from "@/lib/queries";
import { getSessionUser } from "@/lib/auth";
import { getOrgId } from "@/lib/org-context";
import { JobsClient } from "./jobs-client";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const user = await getSessionUser();
  const orgId = getOrgId(user!);
  const jobs = await getJobs(orgId);
  const stats = await getDashboardStats(orgId);
  const hasData = stats.totalUsers > 0;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {user?.role === "viewer"
          ? "View AI pipeline status and processing history."
          : "Run AI pipeline jobs and view processing history."}
      </p>
      <JobsClient initialJobs={jobs} hasData={hasData} userRole={user?.role} />
    </div>
  );
}
