"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Check, X, Brain, BarChart3, History, Tag } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AISuggestion {
  targetRoleId: number;
  targetRoleName: string;
  confidence: number;
  reasoning: string;
  factors: {
    permissionOverlap: number;
    businessFunctionMatch: boolean;
    nameRelevance: number;
    historicalAcceptance: number;
  };
}

interface AISuggestionsModalProps {
  personaId: number;
  personaName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: (targetRoleId: number) => void;
}

export function AISuggestionsModal({ personaId, personaName, open, onOpenChange, onAccept }: AISuggestionsModalProps) {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  async function fetchSuggestions() {
    setLoading(true);
    setSuggestions([]);
    setDismissed(new Set());
    try {
      const res = await fetch(`/api/mapping/ai-suggestions?personaId=${personaId}`);
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to fetch AI suggestions");
        return;
      }
      const data = await res.json();
      setSuggestions(data.suggestions || []);
      setLoaded(true);
    } catch (err) {
      toast.error(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept(suggestion: AISuggestion) {
    setActionLoading(suggestion.targetRoleId);
    try {
      // Record feedback
      await fetch("/api/mapping/ai-suggestions/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId,
          targetRoleId: suggestion.targetRoleId,
          accepted: true,
          aiConfidence: suggestion.confidence,
          aiReasoning: suggestion.reasoning,
        }),
      });
      // Trigger the actual mapping via the parent
      onAccept(suggestion.targetRoleId);
      toast.success(`Accepted: ${suggestion.targetRoleName}`);
    } catch {
      toast.error("Failed to accept suggestion");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDismiss(suggestion: AISuggestion) {
    setActionLoading(suggestion.targetRoleId);
    try {
      await fetch("/api/mapping/ai-suggestions/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId,
          targetRoleId: suggestion.targetRoleId,
          accepted: false,
          aiConfidence: suggestion.confidence,
          aiReasoning: suggestion.reasoning,
        }),
      });
      setDismissed((prev) => {
        const next = new Set(prev);
        next.add(suggestion.targetRoleId);
        return next;
      });
      toast.info(`Dismissed: ${suggestion.targetRoleName}`);
    } catch {
      toast.error("Failed to record feedback");
    } finally {
      setActionLoading(null);
    }
  }

  function handleOpenChange(newOpen: boolean) {
    onOpenChange(newOpen);
    if (newOpen && !loaded) {
      fetchSuggestions();
    }
  }

  const visibleSuggestions = suggestions.filter((s) => !dismissed.has(s.targetRoleId));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-teal-500" />
            AI Mapping Suggestions
          </DialogTitle>
          <DialogDescription>
            AI-ranked target role candidates for <span className="font-medium text-foreground">{personaName}</span>
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
              <p className="text-sm text-muted-foreground">Analyzing roles with AI...</p>
            </div>
          </div>
        )}

        {!loading && visibleSuggestions.length === 0 && loaded && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">No suggestions available for this persona.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={fetchSuggestions}>
              Retry
            </Button>
          </div>
        )}

        {!loading && visibleSuggestions.length > 0 && (
          <div className="space-y-3">
            {visibleSuggestions.map((suggestion, idx) => (
              <SuggestionCard
                key={suggestion.targetRoleId}
                suggestion={suggestion}
                rank={idx + 1}
                isLoading={actionLoading === suggestion.targetRoleId}
                onAccept={() => handleAccept(suggestion)}
                onDismiss={() => handleDismiss(suggestion)}
              />
            ))}
          </div>
        )}

        {!loading && loaded && (
          <div className="flex justify-between items-center pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Confidence blends AI analysis (60%), permission overlap (30%), and historical patterns (10%).
            </p>
            <Button variant="ghost" size="sm" onClick={fetchSuggestions}>
              Refresh
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Suggestion Card ───

function SuggestionCard({
  suggestion,
  rank,
  isLoading,
  onAccept,
  onDismiss,
}: {
  suggestion: AISuggestion;
  rank: number;
  isLoading: boolean;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border p-3 space-y-2 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-xs font-medium text-muted-foreground shrink-0">#{rank}</span>
          <span className="font-medium text-sm truncate">{suggestion.targetRoleName}</span>
          <ConfidenceBadge confidence={suggestion.confidence} />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Less" : "Details"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={onDismiss}
            disabled={isLoading}
          >
            <X className="h-3 w-3" />
            Dismiss
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={onAccept}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Accept
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">{suggestion.reasoning}</p>

      {expanded && (
        <div className="grid grid-cols-2 gap-2 pt-1 border-t">
          <FactorItem
            icon={<BarChart3 className="h-3.5 w-3.5" />}
            label="Permission Overlap"
            value={`${suggestion.factors.permissionOverlap}%`}
            color={suggestion.factors.permissionOverlap >= 60 ? "text-emerald-600" : suggestion.factors.permissionOverlap >= 30 ? "text-yellow-600" : "text-red-500"}
          />
          <FactorItem
            icon={<Brain className="h-3.5 w-3.5" />}
            label="Business Function"
            value={suggestion.factors.businessFunctionMatch ? "Match" : "No match"}
            color={suggestion.factors.businessFunctionMatch ? "text-emerald-600" : "text-muted-foreground"}
          />
          <FactorItem
            icon={<Tag className="h-3.5 w-3.5" />}
            label="Name Relevance"
            value={`${suggestion.factors.nameRelevance}%`}
            color={suggestion.factors.nameRelevance >= 60 ? "text-emerald-600" : "text-muted-foreground"}
          />
          <FactorItem
            icon={<History className="h-3.5 w-3.5" />}
            label="Historical Acceptance"
            value={`${suggestion.factors.historicalAcceptance}%`}
            color={suggestion.factors.historicalAcceptance >= 60 ? "text-emerald-600" : "text-muted-foreground"}
          />
        </div>
      )}
    </div>
  );
}

// ─── Confidence Badge ───

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const color =
    confidence >= 80
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : confidence >= 50
      ? "bg-yellow-100 text-yellow-800 border-yellow-200"
      : "bg-red-100 text-red-800 border-red-200";

  return (
    <Badge variant="outline" className={cn("text-[10px] font-semibold px-1.5 py-0", color)}>
      {confidence}%
    </Badge>
  );
}

// ─── Factor Item ───

function FactorItem({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground">{label}:</span>
      <span className={cn("font-medium", color)}>{value}</span>
    </div>
  );
}

// ─── Trigger Button (for use in parent components) ───

export function AISuggestButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <Button
      size="sm"
      variant="outline"
      className="h-7 text-xs gap-1.5 border-teal-200 text-teal-700 hover:bg-teal-50 hover:text-teal-800"
      onClick={onClick}
      disabled={disabled}
      title="Get AI-powered role suggestions"
    >
      <Sparkles className="h-3 w-3" />
      AI Suggest
    </Button>
  );
}
