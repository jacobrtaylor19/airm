"use client";

export function AdminConsoleClient({ currentUser }: { currentUser: string }) {
  return (
    <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
      <p>Admin console for <span className="font-medium text-foreground">{currentUser}</span></p>
      <p className="mt-1">System settings coming soon.</p>
    </div>
  );
}
