'use client';

import { useMemo, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import type { AccessLevel, FeatureNode } from '@/lib/admin/access';

const LEVELS: AccessLevel[] = ['NONE', 'READ', 'FULL'];
const LABELS: Record<AccessLevel, string> = { NONE: 'No Access', READ: 'Read Access', FULL: 'Full Access' };

function setSubtree(node: FeatureNode, level: AccessLevel, map: Record<string, AccessLevel>) {
  map[node.key] = level;
  node.children.forEach((child) => setSubtree(child, level, map));
}

function leafCount(node: FeatureNode): number {
  if (!node.children.length) return 1;
  return node.children.reduce((sum, child) => sum + leafCount(child), 0);
}

function flattenLeaves(node: FeatureNode): FeatureNode[] {
  if (!node.children.length) return [node];
  return node.children.flatMap(flattenLeaves);
}

function matchesQuery(node: FeatureNode, query: string): boolean {
  if (!query) return true;
  if (node.label.toLowerCase().includes(query)) return true;
  return node.children.some((child) => matchesQuery(child, query));
}

function Segment({ value, onChange }: { value: AccessLevel; onChange: (level: AccessLevel) => void }) {
  return (
    <div className="inline-flex items-center gap-1 text-[12px] font-medium">
      {LEVELS.map((level) => {
        const active = value === level;
        const tone =
          level === 'NONE'
            ? 'bg-slate-100 text-slate-600'
            : 'bg-orange-50 text-secondary ring-1 ring-orange-100';
        return (
          <button
            key={level}
            type="button"
            onClick={() => onChange(level)}
            className={`rounded-full px-3 py-1.5 ${active ? tone : 'text-slate-400 hover:text-slate-700'}`}
          >
            {LABELS[level]}
          </button>
        );
      })}
    </div>
  );
}

export default function RolePermissionEditor({
  tree,
  value,
  onChange,
}: {
  tree: FeatureNode[];
  value: Record<string, AccessLevel>;
  onChange: (next: Record<string, AccessLevel>) => void;
}) {
  const [query, setQuery] = useState('');
  const [openKeys, setOpenKeys] = useState<Record<string, boolean>>({ dashboard: true, [tree[0]?.key || '']: true });
  const q = query.trim().toLowerCase();
  const visible = useMemo(() => tree.filter((node) => matchesQuery(node, q)), [tree, q]);
  const hasRestricted = useMemo(() => tree.some((node) => node.sensitive || flattenLeaves(node).some((leaf) => leaf.sensitive)), [tree]);

  const applyAll = (level: AccessLevel | null) => {
    if (!level) {
      onChange({});
      return;
    }
    const next: Record<string, AccessLevel> = {};
    tree.forEach((node) => setSubtree(node, level, next));
    onChange(next);
  };

  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-100 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-500">
            <Icon name="Squares2X2Icon" size={18} />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">Feature Access</p>
            <p className="text-[12px] text-slate-400">Set access permissions for each module and feature.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Icon name="MagnifyingGlassIcon" size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="h-9 w-44 rounded-full border-0 bg-slate-50 py-2 pl-8 pr-3 text-sm ring-1 ring-slate-100 placeholder:text-slate-400"
              placeholder="Search features..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button type="button" className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-[12px] font-semibold text-rose-500 hover:bg-rose-50" onClick={() => applyAll(null)}>
            <Icon name="XMarkIcon" size={14} /> Clear all
          </button>
          <button type="button" className="h-9 rounded-full px-3 text-[12px] font-semibold text-secondary hover:bg-orange-50" onClick={() => applyAll('READ')}>
            Read all
          </button>
          <button type="button" className="h-9 rounded-full bg-secondary px-3 text-[12px] font-semibold text-white" onClick={() => applyAll('FULL')}>
            Full access all
          </button>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {visible.map((node) => {
          const open = Boolean(openKeys[node.key]) || Boolean(q);
          const leaves = flattenLeaves(node);
          return (
            <div key={node.key} className="overflow-hidden rounded-2xl ring-1 ring-slate-100">
              <button
                type="button"
                className="flex w-full items-center gap-3 bg-white px-4 py-3 text-left"
                onClick={() => setOpenKeys((current) => ({ ...current, [node.key]: !open }))}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-secondary">
                  <Icon name={node.icon || 'Squares2X2Icon'} size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900">{node.label}</span>
                  <span className="block text-[12px] text-slate-400">Access to {node.label.toLowerCase()} and related data.</span>
                </span>
                <span className="text-[12px] text-slate-400">{leafCount(node)} Items</span>
                <Icon name={open ? 'ChevronUpIcon' : 'ChevronDownIcon'} size={16} className="text-slate-400" />
              </button>
              {open ? (
                <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
                  <div className="mb-2 grid grid-cols-[1fr_auto] px-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    <span>Feature</span>
                    <span>Access Level</span>
                  </div>
                  {leaves.map((leaf) => (
                    <div key={leaf.key} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl bg-white px-3 py-2.5 ring-1 ring-slate-100">
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <Icon name={leaf.icon || 'DocumentTextIcon'} size={16} className="text-slate-400" />
                        {leaf.label}
                        {leaf.sensitive ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700">Restricted</span> : null}
                      </div>
                      <Segment
                        value={value[leaf.key] || 'NONE'}
                        onChange={(level) => {
                          const next = { ...value, [leaf.key]: level };
                          onChange(next);
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      {hasRestricted ? (
        <p className="m-4 mt-0 flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-[12px] text-amber-800">
          <Icon name="ExclamationTriangleIcon" size={16} />
          Some features are restricted and require additional permissions. These are marked accordingly.
          <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700">Restricted</span>
        </p>
      ) : null}
    </section>
  );
}
