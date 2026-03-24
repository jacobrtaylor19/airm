import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="max-w-sm">
        <CardContent className="flex flex-col items-center gap-4 pt-6">
          <ShieldAlert className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Access Denied</h2>
          <p className="text-sm text-muted-foreground text-center">
            You do not have permission to access this page.
          </p>
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
