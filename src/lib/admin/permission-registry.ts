import { ADMIN_NAV, type AdminNavItem } from '@/lib/cms/admin-nav';
import { featureKeyFromHref, type FeatureNode } from './access';

const SENSITIVE = /(settings|master-data|profile|webhooks|billing|api-logs|ai\/providers|developer-admins|rbac|youtube-research\/settings)/i;

function slug(label: string, parent?: string) {
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return parent ? `${parent}.${base}` : base;
}

function isSensitive(href?: string, label?: string) {
  return SENSITIVE.test(`${href || ''} ${label || ''}`);
}

function uniqueFeatureKey(base: string, used: Set<string>, label: string) {
  let key = base;
  if (used.has(key)) key = `${base}.${slug(label)}`;
  let suffix = 2;
  while (used.has(key)) {
    key = `${base}.${suffix}`;
    suffix += 1;
  }
  used.add(key);
  return key;
}

function fromNav(items: AdminNavItem[], module: string, parentKey: string | null, used: Set<string>): FeatureNode[] {
  return items.map((item) => {
    const base = item.href
      ? featureKeyFromHref(item.href)
      : item.id || slug(item.label, parentKey || undefined);
    const key = uniqueFeatureKey(base, used, item.label);
    const nextModule = parentKey ? module : item.label;
    const children = item.children ? fromNav(item.children, nextModule, key, used) : [];
    return {
      key,
      label: item.label,
      module: nextModule,
      route: item.href,
      icon: item.icon,
      parentKey,
      sensitive: isSensitive(item.href, item.label),
      children,
    };
  });
}

export function permissionTree(): FeatureNode[] {
  return fromNav(ADMIN_NAV, 'Admin', null, new Set());
}

export function permissionCatalog() {
  const rows: {
    permission_key: string;
    module: string;
    feature: string;
    feature_key: string;
    action: string;
    display_name: string;
  }[] = [];
  const walk = (nodes: FeatureNode[]) => {
    for (const node of nodes) {
      for (const action of ['view', 'create', 'edit', 'delete', 'download', 'approve']) {
        rows.push({
          permission_key: `${node.key}.${action}`,
          module: node.module,
          feature: node.label,
          feature_key: node.key,
          action,
          display_name: `${node.label} ${action}`,
        });
      }
      walk(node.children);
    }
  };
  walk(permissionTree());
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.permission_key)) return false;
    seen.add(row.permission_key);
    return true;
  });
}

export const RBAC_FEATURES = {
  users: 'users',
  roles: 'roles',
  audit: 'audit-logs',
} as const;
