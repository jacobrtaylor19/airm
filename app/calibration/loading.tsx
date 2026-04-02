import { Skeleton } from "@/components/ui/skeleton";

export default function CalibrationLoading() {
  return (
    <div className="space-y-6">
      {/* Title + actions */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-white p-4 space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-8 w-12" />
          <Skeleton className="h-3 w-36" />
        </div>
        <div className="rounded-lg border bg-white p-4 space-y-2">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-4 w-full rounded-full" />
          <Skeleton className="h-4 w-10" />
        </div>
        <div className="rounded-lg border bg-white p-4 space-y-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-8 w-12" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>

      {/* Calibration items */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-white p-4 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-3 w-64" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-32 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
