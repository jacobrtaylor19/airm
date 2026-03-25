"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link2, Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ReviewLinkButtonProps {
  isAdmin: boolean;
}

export function ReviewLinkButton({ isAdmin }: ReviewLinkButtonProps) {
  const [loading, setLoading] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isAdmin) return null;

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch("/api/review-links", { method: "POST" });
      if (!res.ok) {
        toast.error("Failed to generate review link");
        return;
      }
      const data = await res.json();
      setGeneratedUrl(data.url);
      toast.success("Review link generated");
    } catch {
      toast.error("Failed to generate review link");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!generatedUrl) return;
    await navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card className="border-l-4 border-l-teal-500">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          External Reviewer Link
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">
          Generate a shareable read-only link for external reviewers. No login required. Links expire after 7 days.
        </p>

        {generatedUrl ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={generatedUrl}
                className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm bg-slate-50 text-slate-700"
              />
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={loading}>
              Generate another
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={handleGenerate} disabled={loading}>
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Link2 className="h-3.5 w-3.5 mr-1" />
            )}
            Generate Reviewer Link
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
