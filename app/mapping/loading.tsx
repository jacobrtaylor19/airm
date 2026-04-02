import { Skeleton } from "@/components/ui/skeleton";

export default function MappingLoading() {
  return (
    <div className="space-y-6">
      {/* Page description */}
      <Skeleton className="h-4 w-96" />

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        <Skeleton className="h-8 w-36 rounded-md" />
        <Skeleton className="h-8 w-44 rounded-md" />
        <Skeleton className="h-8 w-32 rounded-md" />
      </div>

      {/* Mapping workspace: persona list + role panel */}
      <div className="grid grid-cols-3 gap-6">
        {/* Persona selector */}
        <div className="space-y-2">
          <Skeleton className="h-9 w-full rounded-md" /> {/* search */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-md border p-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
          ))}
        </div>

        {/* Role assignment panel */}
        <div className="col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-24 rounded-md" />
              <Skeleton className="h-8 w-28 rounded-md" />
            </div>
          </div>

          {/* Mapped roles */}
          <div className="rounded-lg border p-4 space-y-3">
            <Skeleton className="h-4 w-32" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between rounded border p-3">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>

          {/* Available roles */}
          <div className="rounded-lg border p-4 space-y-3">
            <Skeleton className="h-4 w-36" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between rounded border p-3">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-6 w-12 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
