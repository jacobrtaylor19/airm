import { getJobs, getDashboardStats } from "@/lib/queries";
import { getSessionUser } from "@/lib/auth";
import { JobsClient } from "./jobs-client";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const jobs = await getJobs();
  const stats = await getDashboardStats();
  const hasData = stats.totalUsers > 0;
  const user = await getSessionUser();

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
