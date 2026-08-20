'use client';

import { useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import AdminBadge from '@/components/admin/AdminBadge';
import { formatOpsWhen } from '@/components/admin/ops/OpsUi';
import type { OpsCommunication } from '@/lib/ops/types';

function statusVariant(status: string): 'green' | 'amber' | 'rose' | 'default' {
  if (status === 'sent' || status === 'delivered' || status === 'read') return 'green';
  if (status === 'pending' || status === 'queued') return 'amber';
  if (status === 'failed' || status === 'error') return 'rose';
  return 'default';
}

export default function CommunicationAccordion({
  items,
  emptyMessage = 'No WhatsApp messages yet.',
}: {
  items: OpsCommunication[];
  emptyMessage?: string;
}) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-6 text-center">
        <Icon name="ChatBubbleLeftRightIcon" size={24} className="mx-auto text-muted-foreground mb-1.5" />
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {items.map((item) => {
        const open = openId === item.id;
        return (
          <div
            key={item.id}
            className={`rounded-lg border transition-colors overflow-hidden ${
              open ? 'border-indigo-200 bg-indigo-50/30' : 'border-border bg-card hover:border-indigo-100'
            }`}
          >
            <button
              type="button"
              onClick={() => setOpenId(open ? null : item.id)}
              className="w-full flex items-start gap-2.5 p-3 text-left"
              aria-expanded={open}
            >
              <div
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                  open ? 'bg-indigo-100 text-indigo-700' : 'bg-muted text-muted-foreground'
                }`}
              >
                <Icon name="ChatBubbleLeftEllipsisIcon" size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-semibold text-foreground capitalize">
                    {item.message_type.replace(/_/g, ' ')}
                  </span>
                  <AdminBadge variant={statusVariant(item.status)}>{item.status}</AdminBadge>
                  <span className="text-[11px] text-muted-foreground">{item.channel}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  {formatOpsWhen(item.created_at)} · {item.recipient}
                </p>
                {!open && (
                  <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2 whitespace-pre-wrap">
                    {item.message_body}
                  </p>
                )}
              </div>
              <Icon
                name="ChevronDownIcon"
                size={16}
                className={`shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
              />
            </button>
            {open && (
              <div className="border-t border-border/80 px-3 pb-3 pt-2 ml-10 mr-3">
                {item.error_message && (
                  <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-100 rounded-md px-2.5 py-1.5 mb-2">
                    {item.error_message}
                  </p>
                )}
                <pre className="whitespace-pre-wrap text-sm text-foreground leading-relaxed bg-white/80 rounded-md border border-border p-3">
                  {item.message_body}
                </pre>
                {item.provider_message_id && (
                  <p className="text-[10px] text-muted-foreground mt-1.5 font-mono">ID: {item.provider_message_id}</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
