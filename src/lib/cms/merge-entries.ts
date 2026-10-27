import { defaultCmsEntries, type CmsEntry } from './default-content';

export interface CmsEntryRow {
  entry_key: string;
  entry_group: string;
  label: string;
  content?: Record<string, unknown>;
  updated_at?: string;
  is_enabled?: boolean;
  sort_order?: number;
}

/** Merge DB rows with defaults so every CMS entry always appears in admin. */
export function mergeCmsEntries(dbRows: CmsEntryRow[] | null | undefined): CmsEntryRow[] {
  const dbMap = new Map((dbRows ?? []).map((row) => [row.entry_key, row]));

  return defaultCmsEntries.map((entry) => {
    const dbRow = dbMap.get(entry.entry_key);
    if (dbRow) {
      return {
        entry_key: entry.entry_key,
        entry_group: dbRow.entry_group || entry.entry_group,
        label: dbRow.label || entry.label,
        content: dbRow.content,
        updated_at: dbRow.updated_at,
        is_enabled: dbRow.is_enabled !== false,
        sort_order: dbRow.sort_order ?? 0,
      };
    }
    return {
      entry_key: entry.entry_key,
      entry_group: entry.entry_group,
      label: entry.label,
      is_enabled: true,
      sort_order: 0,
    };
  }).concat(
    (dbRows ?? [])
      .filter((row) => !defaultCmsEntries.some((entry) => entry.entry_key === row.entry_key))
      .map((row) => ({
        entry_key: row.entry_key,
        entry_group: row.entry_group,
        label: row.label,
        content: row.content,
        updated_at: row.updated_at,
        is_enabled: row.is_enabled !== false,
        sort_order: row.sort_order ?? 0,
      }))
  );
}

export function getDefaultEntryMeta(key: string): Pick<CmsEntry, 'entry_group' | 'label'> | undefined {
  const entry = defaultCmsEntries.find((item) => item.entry_key === key);
  if (entry) return { entry_group: entry.entry_group, label: entry.label };
  if (/^service\.[^.]+\./.test(key)) return { entry_group: 'services', label: 'Service section' };
  return undefined;
}
