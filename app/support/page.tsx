import { requireAuth } from "@/lib/auth";
import { SupportClient } from "./support-client";

export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const user = await requireAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Support</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Submit a ticket and our team will get back to you via email.
        </p>
      </div>
      <div className="max-w-2xl">
        <SupportClient
          userName={user.displayName}
          userEmail={user.email ?? ""}
        />
        <p className="text-xs text-muted-foreground mt-4 text-center">
          For urgent issues, email{" "}
          <a href="mailto:support@provisum.io" className="text-primary hover:underline">
            support@provisum.io
          </a>{" "}
          directly.
        </p>
      </div>
    </div>
  );
}
