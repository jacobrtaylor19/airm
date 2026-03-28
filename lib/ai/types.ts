export interface UserAccessProfile {
  sourceUserId: string;
  displayName: string;
  jobTitle: string | null;
  department: string | null;
  roles: { roleId: string; roleName: string; domain: string | null }[];
  permissions: string[];
}
