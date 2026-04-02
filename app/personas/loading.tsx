import { Skeleton } from "@/components/ui/skeleton";

export default function PersonasLoading() {
  return (
    <div className="space-y-6">
      {/* Description */}
      <Skeleton className="h-4 w-80" />

      {/* Tabs */}
      <div className="flex gap-2">
        <Skeleton className="h-8 w-32 rounded-md" />
        <Skeleton className="h-8 w-44 rounded-md" />
      </div>

      {/* Search + filter + action */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-64 rounded-md" />
        <Skeleton className="h-9 w-40 rounded-md" />
        <Skeleton className="h-9 w-44 rounded-md" />
      </div>

      {/* Table header */}
      <div className="rounded-lg border">
        <div className="border-b p-3 flex gap-6">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-6" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
        {/* Table rows */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="border-b p-3 flex items-center gap-6">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-6" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-28 rounded-full" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-5 w-8 rounded-full" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
