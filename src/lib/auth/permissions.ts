export const permissions = [
  "inspection.create",
  "inspection.review",
  "inspection.close",
  "inventory.view",
  "inventory.update",
  "report.export",
  "user.manage",
  "ppe.configure",
  "audit.view",
  "incident.create",
  "corrective_action.manage",
] as const;

export type PermissionCode = (typeof permissions)[number];

export const roles = [
  "TECHNICIAN",
  "SST_MANAGER",
  "OPERATIONS_COORDINATOR",
  "SYSTEM_ADMIN",
  "MANAGEMENT",
] as const;

export type RoleCode = (typeof roles)[number];

export const rolePermissions: Record<RoleCode, readonly PermissionCode[]> = {
  TECHNICIAN: ["inspection.create", "inventory.view", "incident.create"],
  SST_MANAGER: [
    "inspection.create",
    "inspection.review",
    "inspection.close",
    "inventory.view",
    "inventory.update",
    "report.export",
    "ppe.configure",
    "audit.view",
    "incident.create",
    "corrective_action.manage",
  ],
  OPERATIONS_COORDINATOR: [
    "inspection.create",
    "inspection.review",
    "inventory.view",
    "inventory.update",
    "report.export",
    "incident.create",
    "corrective_action.manage",
  ],
  SYSTEM_ADMIN: permissions,
  MANAGEMENT: ["inventory.view", "report.export", "audit.view"],
};

export function hasPermission(
  grantedPermissions: readonly string[],
  requiredPermission: PermissionCode,
) {
  return grantedPermissions.includes(requiredPermission);
}
