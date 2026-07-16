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
  variant?: 'panel' | 'floating';
}

export default function RequirementQuickChat({
  requirementId,
  apiBase,
  canReply,
  referenceId,
  defaultOpen = false,
  variant = 'panel',
}: RequirementQuickChatProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [refreshKey, setRefreshKey] = useState(0);

  const isAdmin = apiBase.includes('/admin/');

  if (variant === 'floating') {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition-colors"
          aria-label="Open quick chat"
        >
          <Icon name="ChatBubbleLeftRightIcon" size={20} />
          <span className="text-sm font-medium">Quick Chat</span>
        </button>

        {open && (
          <div className="fixed bottom-24 right-6 z-40 w-[min(100vw-2rem,24rem)] bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col max-h-[70vh]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div>
                <p className="font-semibold text-slate-900 text-sm">Quick Chat</p>
                {referenceId && (
                  <p className="text-[10px] text-slate-500 font-mono">{referenceId}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <Icon name="XMarkIcon" size={18} />
              </button>
            </div>
            <div className="p-4 overflow-hidden flex-1">
              <ClarificationThread
                requirementId={requirementId}
                apiBase={apiBase}
                canReply={canReply}
                replyLabel={isAdmin ? 'Send Message' : 'Reply'}
                placeholder={isAdmin ? 'Ask a quick question or share an update…' : 'Reply to continue the conversation…'}
                refreshKey={refreshKey}
                compact
                chatMode="chat"
              />
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) setRefreshKey((k) => k + 1);
        }}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Icon name="ChatBubbleLeftRightIcon" size={18} className="text-indigo-600" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-slate-900">Quick Chat</p>
            <p className="text-xs text-slate-500">
              Threaded conversation to clarify requirements and continue the discussion
            </p>
          </div>
        </div>
        <Icon
          name="ChevronDownIcon"
          size={18}
          className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-slate-100">
          <ClarificationThread
            requirementId={requirementId}
            apiBase={apiBase}
            canReply={canReply}
            replyLabel={isAdmin ? 'Send Message' : 'Reply'}
            placeholder={isAdmin ? 'Ask a quick question or share an update…' : 'Reply to continue the conversation…'}
            refreshKey={refreshKey}
            chatMode="chat"
          />
        </div>
      )}
    </div>
  );
}
