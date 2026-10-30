export type AccessLevel = 'NONE' | 'READ' | 'FULL';

export const ACCESS_RANK: Record<AccessLevel, number> = { NONE: 0, READ: 1, FULL: 2 };

export function maxAccess(a: AccessLevel | undefined, b: AccessLevel | undefined): AccessLevel {
  const left = ACCESS_RANK[a || 'NONE'] || 0;
  const right = ACCESS_RANK[b || 'NONE'] || 0;
  return left >= right ? (a || 'NONE') : (b || 'NONE');
}

export function mergeAccessMaps(maps: Record<string, AccessLevel>[]): Record<string, AccessLevel> {
  const out: Record<string, AccessLevel> = {};
  for (const map of maps) {
    for (const [key, level] of Object.entries(map)) {
      out[key] = maxAccess(out[key], level);
    }
  }
  return out;
}

export type FeatureNode = {
  key: string;
  label: string;
  module: string;
  route?: string;
  icon?: string;
  parentKey: string | null;
  sensitive: boolean;
  children: FeatureNode[];
};

export function inheritAccess(
  tree: FeatureNode[],
  assigned: Record<string, AccessLevel>
): Record<string, AccessLevel> {
  const resolved: Record<string, AccessLevel> = {};
  const walk = (nodes: FeatureNode[], parentLevel: AccessLevel) => {
    for (const node of nodes) {
      const own = assigned[node.key];
      const inherited = node.sensitive && !own ? 'NONE' : parentLevel;
      const level = own || inherited;
      if (level !== 'NONE') resolved[node.key] = level;
      walk(node.children, own || parentLevel);
    }
  };
  walk(tree, 'NONE');
  return resolved;
}

export function canWithAccess(
  access: Record<string, AccessLevel> | undefined,
  featureKey: string,
  needed: AccessLevel = 'READ'
): boolean {
  if (!access) return false;
  const have = ACCESS_RANK[access[featureKey] || 'NONE'];
  return have >= ACCESS_RANK[needed];
}

export function grantsAction(level: AccessLevel | undefined, action: string): boolean {
  const value = level || 'NONE';
  if (value === 'NONE') return false;
  if (value === 'READ') return ['view', 'download', 'export', 'print', 'search'].includes(action);
  return true;
}

export function flattenFeatures(tree: FeatureNode[]): FeatureNode[] {
  return tree.flatMap((node) => [node, ...flattenFeatures(node.children)]);
}

export function matchFeatureForPath(tree: FeatureNode[], pathname: string): FeatureNode | null {
  const leaves = flattenFeatures(tree).filter((node) => node.route);
  const ranked = leaves
    .filter((node) => pathname === node.route || pathname.startsWith(`${node.route}/`))
    .sort((a, b) => String(b.route).length - String(a.route).length);
  return ranked[0] || null;
}

export function matchFeatureForApi(tree: FeatureNode[], apiPath: string): FeatureNode | null {
  const mapped = apiPath.replace(/^\/api\/admin/, '/admin');
  return matchFeatureForPath(tree, mapped);
}

export function featureKeyFromHref(href: string) {
  const trimmed = href.replace(/^\/admin\/?/, '').replace(/\/+$/, '');
  return trimmed ? trimmed.replace(/\//g, '.') : 'dashboard';
}
