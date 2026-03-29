"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Users,
  UserCog,
  ChevronRight,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  Save,
} from "lucide-react";

// -----------------------------------------------
// Types (shared with parent)
// -----------------------------------------------

export interface OrgTreeNode {
  id: number;
  name: string;
  level: string;
  parentId: number | null;
  description: string | null;
  children: OrgTreeNode[];
  userCount: number;
  assignedMapper: string | null;
  assignedApprover: string | null;
}

export interface AppUserOption {
  id: number;
  displayName: string;
  role: string;
}

// -----------------------------------------------
// OrgTreeItem (recursive)
// -----------------------------------------------

function OrgTreeItem({
  node,
  depth = 0,
  mappers,
  approvers,
  onEdit,
  onDelete,
  onAssign,
}: {
  node: OrgTreeNode;
  depth?: number;
  mappers: AppUserOption[];
  approvers: AppUserOption[];
  onEdit: (node: OrgTreeNode) => void;
  onDelete: (node: OrgTreeNode) => void;
  onAssign: (nodeId: number, mapperId: number | null, approverId: number | null) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const [showAssign, setShowAssign] = useState(false);
  const [mapperId, setMapperId] = useState<string>("");
  const [approverId, setApproverId] = useState<string>("");
  const hasChildren = node.children.length > 0;

  const levelColors: Record<string, string> = {
    L1: "bg-blue-100 text-blue-800",
    L2: "bg-emerald-100 text-emerald-800",
    L3: "bg-amber-100 text-amber-800",
  };

  return (
    <div>
      <div
        className={`flex items-center gap-2 rounded-md px-3 py-2 hover:bg-muted/50 group ${depth === 0 ? "border-b" : ""}`}
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        <span
          className="cursor-pointer shrink-0"
          onClick={() => hasChildren && setExpanded(!expanded)}
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )
          ) : (
            <span className="w-4" />
          )}
        </span>
        <Badge
          variant="secondary"
          className={`text-[10px] px-1.5 py-0 ${levelColors[node.level] || ""}`}
        >
          {node.level}
        </Badge>
        <span className="font-medium text-sm">{node.name}</span>
        {node.description && (
          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
            — {node.description}
          </span>
        )}
        <span className="text-xs text-muted-foreground ml-auto flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {node.userCount}
          </span>
          {node.assignedMapper && (
            <span className="flex items-center gap-1 text-blue-600">
              <UserCog className="h-3 w-3" />
              {node.assignedMapper}
            </span>
          )}
          {node.assignedApprover && (
            <span className="flex items-center gap-1 text-emerald-600">
              <UserCog className="h-3 w-3" />
              {node.assignedApprover}
            </span>
          )}
          <span className="hidden group-hover:flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                setShowAssign(!showAssign);
              }}
              title="Assign mapper/approver"
            >
              <UserCog className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(node);
              }}
              title="Edit"
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(node);
              }}
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </span>
        </span>
      </div>

      {/* Inline assign mapper/approver */}
      {showAssign && (
        <div
          className="flex items-center gap-2 py-2 px-4 bg-muted/20 border-b"
          style={{ paddingLeft: `${depth * 24 + 40}px` }}
        >
          <Label className="text-xs whitespace-nowrap">Mapper:</Label>
          <Select value={mapperId} onValueChange={setMapperId}>
            <SelectTrigger className="h-7 text-xs w-40">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {mappers.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {m.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Label className="text-xs whitespace-nowrap ml-2">Approver:</Label>
          <Select value={approverId} onValueChange={setApproverId}>
            <SelectTrigger className="h-7 text-xs w-40">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {approvers.map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>
                  {a.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => {
              onAssign(
                node.id,
                mapperId && mapperId !== "__none__" ? Number(mapperId) : null,
                approverId && approverId !== "__none__" ? Number(approverId) : null
              );
              setShowAssign(false);
            }}
          >
            <Save className="h-3 w-3 mr-1" />
            Save
          </Button>
        </div>
      )}

      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <OrgTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              mappers={mappers}
              approvers={approvers}
              onEdit={onEdit}
              onDelete={onDelete}
              onAssign={onAssign}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------
// OrgTreeSection
// -----------------------------------------------

export interface OrgTreeSectionProps {
  orgTree: OrgTreeNode[];
  mappers: AppUserOption[];
  approvers: AppUserOption[];
  loading: boolean;
  onEdit: (node: OrgTreeNode) => void;
  onDelete: (node: OrgTreeNode) => void;
  onAssign: (nodeId: number, mapperId: number | null, approverId: number | null) => void;
  onAddClick: () => void;
}

export function OrgTreeSection({
  orgTree,
  mappers,
  approvers,
  loading,
  onEdit,
  onDelete,
  onAssign,
  onAddClick,
}: OrgTreeSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Organizational Hierarchy
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Tree view of the org hierarchy (L1 / L2 / L3). Hover nodes to edit, delete, or assign mapper/approver.
            </p>
          </div>
          <Button size="sm" onClick={onAddClick}>
            <Plus className="h-4 w-4 mr-1" />
            Add Org Unit
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Loading org hierarchy...</p>
        ) : orgTree.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">No org hierarchy configured.</p>
            <Button size="sm" variant="outline" className="mt-2" onClick={onAddClick}>
              <Plus className="h-4 w-4 mr-1" />
              Add your first org unit
            </Button>
          </div>
        ) : (
          <div className="rounded-md border divide-y">
            {/* Legend */}
            <div className="flex gap-4 text-xs px-3 py-2 bg-muted/30">
              <span className="flex items-center gap-1">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-800">L1</Badge>
                Division
              </span>
              <span className="flex items-center gap-1">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-800">L2</Badge>
                Department
              </span>
              <span className="flex items-center gap-1">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-800">L3</Badge>
                Section
              </span>
              <span className="ml-auto flex items-center gap-3">
                <span className="flex items-center gap-1 text-blue-600">
                  <UserCog className="h-3 w-3" /> Mapper
                </span>
                <span className="flex items-center gap-1 text-emerald-600">
                  <UserCog className="h-3 w-3" /> Approver
                </span>
              </span>
            </div>
            {orgTree.map((node) => (
              <OrgTreeItem
                key={node.id}
                node={node}
                mappers={mappers}
                approvers={approvers}
                onEdit={onEdit}
                onDelete={onDelete}
                onAssign={onAssign}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
