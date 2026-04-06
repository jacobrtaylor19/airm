"use client";

import { useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Clock } from "lucide-react";

interface AiDurationDialogProps {
  children: ReactNode;
  onConfirm: () => void;
  actionName?: string;
  isDemo?: boolean;
}

/**
 * In demo mode, shows a dialog warning that AI generation may take up to 3 minutes
 * before proceeding. In non-demo mode, calls onConfirm directly.
 */
export function AiDurationDialog({ children, onConfirm, actionName = "AI generation", isDemo = false }: AiDurationDialogProps) {
  const [open, setOpen] = useState(false);

  if (!isDemo) {
    // In non-demo, just render the trigger that calls onConfirm directly
    return <span onClick={onConfirm}>{children}</span>;
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-teal-600" />
            {actionName}
          </AlertDialogTitle>
          <AlertDialogDescription>
            This operation uses AI and may take up to <strong>3 minutes</strong> to
            complete. You can navigate away and check back — progress is tracked
            on the Processing Jobs page.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-teal-600 hover:bg-teal-700"
            onClick={() => {
              setOpen(false);
              onConfirm();
            }}
          >
            Start {actionName}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
