"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, UserCog, ChevronRight, ChevronDown } from "lucide-react";

interface OrgTreeNode {
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

function OrgTreeItem({ node, depth = 0 }: { node: OrgTreeNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children.length > 0;

  const levelColors: Record<string, string> = {
    L1: "bg-blue-100 text-blue-800",
    L2: "bg-emerald-100 text-emerald-800",
    L3: "bg-amber-100 text-amber-800",
  };

  return (
    <div>
      <div
        className={`flex items-center gap-2 rounded-md px-3 py-2 hover:bg-muted/50 cursor-pointer ${depth === 0 ? "border-b" : ""}`}
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${levelColors[node.level] || ""}`}>
          {node.level}
        </Badge>
        <span className="font-medium text-sm">{node.name}</span>
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
        </span>
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <OrgTreeItem key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminConsoleClient({ currentUser }: { currentUser: string }) {
  const [orgTree, setOrgTree] = useState<OrgTreeNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/org-hierarchy")
      .then((res) => res.json())
      .then((data) => {
        setOrgTree(data.tree || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <Tabs defaultValue="org-hierarchy">
      <TabsList>
        <TabsTrigger value="org-hierarchy" className="flex items-center gap-1.5">
          <Building2 className="h-4 w-4" />
          Org Hierarchy
        </TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>

      <TabsContent value="org-hierarchy" className="mt-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Organizational Hierarchy
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Tree view of the org hierarchy (L1 / L2 / L3). Each node shows user count and assigned mapper/approver.
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Loading org hierarchy...</p>
            ) : orgTree.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No org hierarchy configured. Re-seed the database to generate the hierarchy.</p>
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
                  <OrgTreeItem key={node.id} node={node} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="settings" className="mt-4">
        <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
          <p>Admin console for <span className="font-medium text-foreground">{currentUser}</span></p>
          <p className="mt-1">System settings coming soon.</p>
        </div>
      </TabsContent>
    </Tabs>
  );
}
