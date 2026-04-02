import { Skeleton } from "@/components/ui/skeleton";

export default function RiskAnalysisLoading() {
  return (
    <div className="space-y-6">
      {/* Risk cards */}
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-3 w-full" />
            <div className="flex gap-6">
              <div className="space-y-1">
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-3 w-28" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-7 w-12" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Analysis summary */}
      <div className="rounded-lg border bg-white p-5 space-y-4">
        <Skeleton className="h-4 w-40" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-4 space-y-2 text-center">
              <Skeleton className="h-8 w-16 mx-auto" />
              <Skeleton className="h-3 w-28 mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Flagged users table */}
      <div className="rounded-lg border bg-white p-5 space-y-4">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-96" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-8 py-2 border-b">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-5 w-8 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
