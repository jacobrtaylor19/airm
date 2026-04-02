import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert, Home, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-md">
        <CardContent className="flex flex-col items-center gap-4 pt-8 pb-6 px-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <ShieldAlert className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="text-lg font-semibold">Access Denied</h2>
          <p className="text-sm text-muted-foreground text-center leading-relaxed">
            Your current role does not have permission to view this page.
            Contact your system administrator if you believe this is an error.
          </p>
          <div className="flex items-center gap-3 mt-2">
            <Link href="/home">
              <Button variant="outline" size="sm">
                <Home className="h-4 w-4 mr-1.5" />
                Home
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="sm" className="bg-teal-500 hover:bg-teal-600 text-white">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
