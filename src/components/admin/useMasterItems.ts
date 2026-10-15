'use client';

import { useEffect, useState } from 'react';

export interface MasterOption {
  value: string;
  label: string;
  parent?: string | null;
}

export function useMasterItems(listKey: string, fallback: MasterOption[]) {
  const [options, setOptions] = useState<MasterOption[]>(fallback);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/master-data?list=${encodeURIComponent(listKey)}`)
      .then((response) => response.json())
      .then((body) => {
        const rows = Array.isArray(body.items) ? body.items : [];
        const next = rows
          .filter((row: { active?: boolean }) => row.active !== false)
          .map((row: { item_key: string; label: string; parent_key?: string | null }) => ({
            value: row.item_key,
            label: row.label,
            parent: row.parent_key,
          }));
        if (!cancelled && next.length) setOptions(next);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [listKey]);

  return options;
}
