"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Loader2, FileUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type UploadStatus = "idle" | "uploading" | "preview" | "committing" | "done" | "error";

type PreviewData = {
  totalRows: number;
  headers: string[];
  preview: Record<string, string>[];
};

export function UploadCard({
  type,
  label,
  description,
  expectedColumns,
  required,
  existingCount,
}: {
  type: string;
  label: string;
  description: string;
  expectedColumns: string;
  required: boolean;
  existingCount: number;
}) {
  const [status, setStatus] = useState<UploadStatus>(existingCount > 0 ? "done" : "idle");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [result, setResult] = useState<{ inserted: number; skipped: number; errors: string[] } | null>(
    existingCount > 0 ? { inserted: existingCount, skipped: 0, errors: [] } : null
  );
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(file: File) {
    setSelectedFile(file);
    setStatus("uploading");
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("action", "preview");

    try {
      const res = await fetch(`/api/upload/${type}`, { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed");
        setStatus("error");
        return;
      }

      setPreview(data);
      setStatus("preview");
    } catch {
      setError("Network error");
      setStatus("error");
    }
  }

  async function handleCommit() {
    if (!selectedFile) return;
    setStatus("committing");

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("action", "commit");

    try {
      const res = await fetch(`/api/upload/${type}`, { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Commit failed");
        setStatus("error");
        return;
      }

      setResult(data);
      setStatus("done");
      setPreview(null);
    } catch {
      setError("Network error");
      setStatus("error");
    }
  }

  return (
    <>
      <Card className={status === "done" ? "border-emerald-200 bg-emerald-50/50" : ""}>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {required && <span className="text-red-500">*</span>}
              {label}
              {status === "done" && <CheckCircle className="h-4 w-4 text-emerald-600" />}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div>
            {status === "done" && result ? (
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                {result.inserted} loaded
              </Badge>
            ) : status === "uploading" || status === "committing" ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : status === "error" ? (
              <Badge variant="destructive">Error</Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-muted-foreground">
            Expected: <code className="rounded bg-muted px-1">{expectedColumns}</code>
          </p>
          {error && (
            <div className="mb-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
              <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0" />
              {error}
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileSelect(f);
            }}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={status === "uploading" || status === "committing"}
          >
            <FileUp className="mr-1 h-3 w-3" />
            {status === "done" ? "Replace" : "Upload CSV"}
          </Button>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={status === "preview"} onOpenChange={(open) => !open && setStatus("idle")}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview: {label}</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {preview.totalRows} rows found. Showing first {Math.min(5, preview.totalRows)}.
              </p>
              <div className="overflow-x-auto rounded border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      {preview.headers.map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.preview.map((row, i) => (
                      <tr key={i} className="border-b last:border-0">
                        {preview.headers.map((h) => (
                          <td key={h} className="max-w-[200px] truncate px-3 py-1.5">
                            {row[h] || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatus("idle")}>
              Cancel
            </Button>
            <Button onClick={handleCommit}>
              Commit {preview?.totalRows} rows
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
