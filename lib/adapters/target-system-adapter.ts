/**
 * Target System Adapter Interface
 *
 * Defines the contract for connecting to target ERP/HCM systems
 * (SAP S/4HANA, Workday, ServiceNow, Oracle Fusion) to import
 * and continuously sync the security design.
 */

export interface TargetSystemAdapter {
  name: string;
  type: "sap_s4hana" | "workday" | "servicenow" | "oracle_fusion" | "mock";

  /** Test connection to the target system */
  testConnection(): Promise<{ connected: boolean; message: string }>;

  /** Pull the current security design (roles + permissions) */
  pullSecurityDesign(): Promise<SecurityDesignSnapshot>;

  /** Get changes since last pull */
  getChanges(since: Date): Promise<SecurityDesignChange[]>;
}

export interface SecurityDesignSnapshot {
  pulledAt: Date;
  roles: TargetRoleSnapshot[];
  totalPermissions: number;
}

export interface TargetRoleSnapshot {
  externalId: string;
  name: string;
  description: string;
  type: "single" | "composite" | "task";
  permissions: { name: string; description: string }[];
  childRoles?: string[]; // for composite roles
}

export interface SecurityDesignChange {
  changeType:
    | "role_added"
    | "role_removed"
    | "role_modified"
    | "permission_added"
    | "permission_removed";
  roleName: string;
  roleExternalId: string;
  detail: string;
  detectedAt: Date;
}
