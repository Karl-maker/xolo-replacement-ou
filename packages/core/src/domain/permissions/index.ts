export const PERMISSIONS = {
  companies: ["read", "write", "delete"],
} as const satisfies Record<string, readonly string[]>;

export type PermissionResource = keyof typeof PERMISSIONS;

export type PermissionAction<
  R extends PermissionResource = PermissionResource,
> = (typeof PERMISSIONS)[R][number];

export type Permission = {
  [R in PermissionResource]: `${R}:${PermissionAction<R>}`;
}[PermissionResource];

export function isPermission(value: unknown): value is Permission {
  if (typeof value !== "string") return false;

  const [resource, action, ...extra] = value.split(":");

  if (!resource || !action || extra.length > 0) return false;

  if (!Object.hasOwn(PERMISSIONS, resource)) return false;

  const actions = (
    PERMISSIONS as Record<string, readonly string[] | undefined>
  )[resource];

  return actions?.includes(action) ?? false;
}

export function parsePermission(value: unknown): Permission {
  if (!isPermission(value)) {
    throw new TypeError(`Invalid permission: ${String(value)}`);
  }

  return value;
}

export function createPermission<R extends PermissionResource>(
  resource: R,
  action: PermissionAction<R>,
): `${R}:${PermissionAction<R>}` {
  return `${resource}:${action}`;
}
