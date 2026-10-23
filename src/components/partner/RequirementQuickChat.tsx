'use client';

import { useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import ClarificationThread from '@/components/partner/ClarificationThread';

interface RequirementQuickChatProps {
  requirementId: string;
  apiBase: '/api/partner/requirements' | '/api/admin/partner-requirements';
  canReply: boolean;
  referenceId?: string;
  defaultOpen?: boolean;
  variant?: 'panel' | 'floating' | 'sidebar';
}

export default function RequirementQuickChat({
  requirementId,
  apiBase,
  canReply,
  referenceId,
  defaultOpen = false,
  variant = 'panel',
}: RequirementQuickChatProps) {
  const [open, setOpen] = useState(defaultOpen || variant === 'sidebar');
  const [refreshKey, setRefreshKey] = useState(0);

  const isAdmin = apiBase.includes('/admin/');
  const replyLabel = 'Send';
  const placeholder = isAdmin ? 'Ask a question or share an update…' : 'Type a message…';

  if (variant === 'sidebar') {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50">
            <Icon name="ChatBubbleLeftRightIcon" size={18} className="text-secondary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">Quick Chat</p>
            {referenceId ? <p className="truncate font-mono text-[10px] text-slate-400">{referenceId}</p> : null}
          </div>
        </div>
        <div className="min-h-0 flex-1">
          <ClarificationThread
            requirementId={requirementId}
            apiBase={apiBase}
            canReply={canReply}
            replyLabel={replyLabel}
            placeholder={placeholder}
            refreshKey={refreshKey}
            chatMode="chat"
            fillHeight
          />
        </div>
      </div>
    );
  }

  if (variant === 'floating') {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-secondary px-4 py-3 text-white shadow-lg hover:bg-secondary/90"
          aria-label="Open quick chat"
        >
          <Icon name="ChatBubbleLeftRightIcon" size={20} />
          <span className="text-sm font-medium">Quick Chat</span>
        </button>

        {open && (
          <div className="fixed bottom-24 right-6 z-40 flex max-h-[70vh] w-[min(100vw-2rem,24rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Quick Chat</p>
                {referenceId ? <p className="font-mono text-[10px] text-slate-500">{referenceId}</p> : null}
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <Icon name="XMarkIcon" size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <ClarificationThread
                requirementId={requirementId}
                apiBase={apiBase}
                canReply={canReply}
                replyLabel={replyLabel}
                placeholder={placeholder}
                refreshKey={refreshKey}
                compact
                chatMode="chat"
                fillHeight
              />
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) setRefreshKey((k) => k + 1);
        }}
        className="flex w-full items-center justify-between px-5 py-4 transition-colors hover:bg-slate-50"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50">
            <Icon name="ChatBubbleLeftRightIcon" size={18} className="text-secondary" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-slate-900">Quick Chat</p>
            <p className="text-xs text-slate-500">Send a message to continue the discussion</p>
          </div>
        </div>
        <Icon name="ChevronDownIcon" size={18} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-slate-100 px-5 pb-5">
          <ClarificationThread
            requirementId={requirementId}
            apiBase={apiBase}
            canReply={canReply}
            replyLabel={replyLabel}
            placeholder={placeholder}
            refreshKey={refreshKey}
            chatMode="chat"
          />
        </div>
      )}
    </div>
  );
}
