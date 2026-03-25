"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface BulkDeleteBarProps {
  selectedCount: number;
  entityLabel: string;
  onDelete: () => void;
  onClear: () => void;
}

export function BulkDeleteBar({
  selectedCount,
  entityLabel,
  onDelete,
  onClear,
}: BulkDeleteBarProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      {showConfirm ? (
        <div className="bg-background border-2 border-destructive rounded-lg shadow-xl px-6 py-4 flex items-center gap-4">
          <p className="text-sm font-medium">
            Are you sure you want to delete {selectedCount} {entityLabel}? This cannot be undone.
          </p>
          <Button variant="outline" size="sm" onClick={() => setShowConfirm(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              onDelete();
              setShowConfirm(false);
            }}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
          </Button>
        </div>
      ) : (
        <div className="bg-foreground text-background rounded-lg shadow-xl px-6 py-3 flex items-center gap-4">
          <span className="text-sm font-medium">{selectedCount} selected</span>
          <Button variant="ghost" size="sm" className="text-background hover:text-foreground" onClick={onClear}>
            Clear
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setShowConfirm(true)}>
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
          </Button>
        </div>
      )}
    </div>
  );
}
