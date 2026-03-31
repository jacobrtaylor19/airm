/**
 * Mock SAP S/4HANA Adapter
 *
 * Implements TargetSystemAdapter with hardcoded but realistic
 * SAP S/4HANA role and permission data for development and demos.
 */

import type {
  TargetSystemAdapter,
  SecurityDesignSnapshot,
  SecurityDesignChange,
  TargetRoleSnapshot,
} from "./target-system-adapter";

const MOCK_ROLES: TargetRoleSnapshot[] = [
  {
    externalId: "SAP_FI_AP_CLERK",
    name: "FI Accounts Payable Clerk",
    description: "Process vendor invoices, payment runs, and AP reporting in SAP FI",
    type: "single",
    permissions: [
      { name: "FB60", description: "Enter Incoming Invoices" },
      { name: "FB65", description: "Preliminary Posting of Incoming Invoices" },
      { name: "F110", description: "Payment Run (Parameters / Proposals / Payments)" },
      { name: "FBL1N", description: "Vendor Line Item Display" },
      { name: "FK10N", description: "Vendor Balance Display" },
      { name: "MIRO", description: "Enter Incoming Invoice (Logistics)" },
      { name: "F-44", description: "Clear Vendor Open Items" },
      { name: "FBR2", description: "Post Document (Recurring)" },
      { name: "S_ALR_87012103", description: "Vendor Balances in Local Currency" },
    ],
  },
  {
    externalId: "SAP_MM_PURCHASER",
    name: "MM Purchasing Agent",
    description: "Create and manage purchase orders, source determination, and goods receipt",
    type: "single",
    permissions: [
      { name: "ME21N", description: "Create Purchase Order" },
      { name: "ME22N", description: "Change Purchase Order" },
      { name: "ME23N", description: "Display Purchase Order" },
      { name: "ME51N", description: "Create Purchase Requisition" },
      { name: "ME52N", description: "Change Purchase Requisition" },
      { name: "ME57", description: "Assign and Process Purchase Requisitions" },
      { name: "MIGO", description: "Goods Movement (Receipt / Issue / Transfer)" },
      { name: "ME2M", description: "Purchase Orders by Material" },
      { name: "ME2N", description: "Purchase Orders by PO Number" },
      { name: "ML81N", description: "Service Entry Sheet" },
    ],
  },
  {
    externalId: "SAP_SD_SALES_REP",
    name: "SD Sales Representative",
    description: "Manage the order-to-cash cycle including quotations, orders, and billing",
    type: "single",
    permissions: [
      { name: "VA01", description: "Create Sales Order" },
      { name: "VA02", description: "Change Sales Order" },
      { name: "VA03", description: "Display Sales Order" },
      { name: "VA21", description: "Create Quotation" },
      { name: "VA22", description: "Change Quotation" },
      { name: "VF01", description: "Create Billing Document" },
      { name: "VL01N", description: "Create Outbound Delivery" },
      { name: "VL02N", description: "Change Outbound Delivery" },
      { name: "VA05", description: "List of Sales Orders" },
      { name: "VF05", description: "List of Billing Documents" },
      { name: "VKM1", description: "Blocked Sales Orders (Credit)" },
    ],
  },
  {
    externalId: "SAP_HR_ADMIN",
    name: "HR Administrator",
    description: "Maintain employee master data, organizational management, and time recording",
    type: "single",
    permissions: [
      { name: "PA20", description: "Display HR Master Data" },
      { name: "PA30", description: "Maintain HR Master Data" },
      { name: "PA40", description: "Personnel Actions" },
      { name: "PP01", description: "Maintain Org Plan (Object)" },
      { name: "PPOME", description: "Maintain Organizational Plan" },
      { name: "PT60", description: "Time Evaluation" },
      { name: "PT01", description: "Create Work Schedule" },
      { name: "PA10", description: "Personnel File" },
      { name: "S_AHR_61016", description: "Payroll Result Display" },
    ],
  },
  {
    externalId: "SAP_FI_GL_ACCOUNTANT",
    name: "FI General Ledger Accountant",
    description: "Manage GL postings, period-end close, and financial reporting",
    type: "single",
    permissions: [
      { name: "FB50", description: "GL Account Document Entry" },
      { name: "FB01", description: "Post Document" },
      { name: "FB02", description: "Change Document" },
      { name: "FB03", description: "Display Document" },
      { name: "FAGLB03", description: "GL Account Balances (New GL)" },
      { name: "FBL3N", description: "GL Line Item Display" },
      { name: "F.01", description: "ABAP/4 Report: Financial Statements" },
      { name: "OB52", description: "Maintain Posting Periods" },
      { name: "AJAB", description: "Year-End Closing (Asset)" },
      { name: "F101", description: "Foreign Currency Valuation" },
      { name: "S_ALR_87012284", description: "GL Account Balances Report" },
      { name: "GR55", description: "Execute Report Writer Reports" },
    ],
  },
  {
    externalId: "SAP_PP_PLANNER",
    name: "PP Production Planner",
    description: "Production planning, MRP runs, and shop floor control in SAP PP",
    type: "single",
    permissions: [
      { name: "MD01", description: "MRP Run (Total Planning)" },
      { name: "MD04", description: "Stock/Requirements List" },
      { name: "MD05", description: "MRP List (Individual)" },
      { name: "CO01", description: "Create Production Order" },
      { name: "CO02", description: "Change Production Order" },
      { name: "CO03", description: "Display Production Order" },
      { name: "CO11N", description: "Confirm Production Order" },
      { name: "COOIS", description: "Production Order Information System" },
      { name: "CR01", description: "Create Work Center" },
      { name: "CS01", description: "Create BOM" },
    ],
  },
  {
    externalId: "SAP_BASIS_ADMIN",
    name: "Basis Administrator",
    description: "System administration, user management, transport management, and monitoring",
    type: "composite",
    permissions: [
      { name: "SU01", description: "User Maintenance" },
      { name: "SU10", description: "User Mass Maintenance" },
      { name: "PFCG", description: "Role Maintenance" },
      { name: "SM37", description: "Job Overview / Background Processing" },
      { name: "SM21", description: "System Log" },
      { name: "ST22", description: "ABAP Runtime Error Analysis" },
      { name: "STMS", description: "Transport Management System" },
      { name: "SM59", description: "RFC Destinations Configuration" },
      { name: "SM50", description: "Work Process Overview" },
      { name: "SM51", description: "Application Servers Overview" },
      { name: "SM36", description: "Define Background Job" },
      { name: "SE16", description: "Data Browser" },
      { name: "SM12", description: "Display and Delete Locks" },
    ],
    childRoles: ["SAP_BASIS_USER_ADMIN", "SAP_BASIS_TRANSPORT", "SAP_BASIS_MONITORING"],
  },
  {
    externalId: "SAP_GRC_ADMIN",
    name: "GRC Access Control Administrator",
    description: "Manage SOD rules, access risk analysis, emergency access, and role provisioning",
    type: "single",
    permissions: [
      { name: "NWBC_GRC_ARA", description: "Access Risk Analysis" },
      { name: "NWBC_GRC_ARM", description: "Access Request Management" },
      { name: "NWBC_GRC_BRM", description: "Business Role Management" },
      { name: "NWBC_GRC_EAM", description: "Emergency Access Management" },
      { name: "GRAC_RULE_SETUP", description: "Rule Setup and Maintenance" },
      { name: "GRAC_RISK_ANLY", description: "Risk Analysis Execution" },
      { name: "GRAC_MITIGATION", description: "Mitigating Controls Maintenance" },
      { name: "GRAC_USER_PROV", description: "User Provisioning Workflow" },
      { name: "GRAC_SOD_REVIEW", description: "SOD Review and Remediation" },
    ],
  },
  {
    externalId: "SAP_CO_CONTROLLER",
    name: "CO Cost Center Controller",
    description: "Cost center accounting, internal orders, and profitability analysis",
    type: "single",
    permissions: [
      { name: "KS01", description: "Create Cost Center" },
      { name: "KS02", description: "Change Cost Center" },
      { name: "KSB1", description: "Cost Centers: Actual Line Items" },
      { name: "KO01", description: "Create Internal Order" },
      { name: "KO02", description: "Change Internal Order" },
      { name: "S_ALR_87013611", description: "Cost Centers: Actual/Plan/Variance" },
      { name: "KE30", description: "Profitability Analysis Report" },
      { name: "KSBT", description: "Cost Centers: Commitment Line Items" },
    ],
  },
];

export class MockSapAdapter implements TargetSystemAdapter {
  name = "Mock SAP S/4HANA";
  type = "mock" as const;

  async testConnection(): Promise<{ connected: boolean; message: string }> {
    // Simulate network latency
    await new Promise((resolve) => setTimeout(resolve, 200));
    return {
      connected: true,
      message: "Successfully connected to Mock SAP S/4HANA (development instance)",
    };
  }

  async pullSecurityDesign(): Promise<SecurityDesignSnapshot> {
    // Simulate network latency
    await new Promise((resolve) => setTimeout(resolve, 300));

    const totalPermissions = MOCK_ROLES.reduce(
      (sum, role) => sum + role.permissions.length,
      0
    );

    return {
      pulledAt: new Date(),
      roles: MOCK_ROLES,
      totalPermissions,
    };
  }

  async getChanges(since: Date): Promise<SecurityDesignChange[]> {
    // Simulate network latency
    await new Promise((resolve) => setTimeout(resolve, 150));

    const now = new Date();

    // Return 3 mock changes that happened "after" the since date
    return [
      {
        changeType: "role_modified",
        roleName: "FI Accounts Payable Clerk",
        roleExternalId: "SAP_FI_AP_CLERK",
        detail:
          "Authorization object F_BKPF_BUK updated: added company codes 2000, 3000 to allowed values",
        detectedAt: new Date(
          since.getTime() + (now.getTime() - since.getTime()) * 0.3
        ),
      },
      {
        changeType: "permission_added",
        roleName: "MM Purchasing Agent",
        roleExternalId: "SAP_MM_PURCHASER",
        detail:
          'New transaction ME29N (Release Purchase Order) added to role permissions',
        detectedAt: new Date(
          since.getTime() + (now.getTime() - since.getTime()) * 0.6
        ),
      },
      {
        changeType: "role_modified",
        roleName: "GRC Access Control Administrator",
        roleExternalId: "SAP_GRC_ADMIN",
        detail:
          "Emergency access (firefighter) log review period changed from 7 to 14 days",
        detectedAt: new Date(
          since.getTime() + (now.getTime() - since.getTime()) * 0.9
        ),
      },
    ];
  }
}

/** Exported roles for use in tests and seed scripts */
export const MOCK_SAP_ROLES = MOCK_ROLES;
