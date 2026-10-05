export default function LoginLaptopPreview() {
  return (
    <div className="relative mx-auto mt-10 w-full max-w-xl lg:mt-14">
      <div className="absolute -top-8 right-6 z-20 hidden sm:block">
        <div className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 shadow-lg ring-1 ring-black/5">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#25D366] text-white">
            <WhatsAppGlyph />
          </span>
          <div className="pr-1">
            <p className="text-[11px] font-semibold text-slate-900">Message delivered</p>
            <p className="text-[10px] text-slate-500">to 2,500+ customers</p>
          </div>
          <span className="text-[#25D366]">
            <CheckGlyph />
          </span>
        </div>
      </div>

      <div className="relative mx-auto w-[92%]">
        <div className="rounded-t-xl border border-slate-200 bg-slate-900 px-3 pt-3 shadow-2xl">
          <div className="mb-2 flex items-center justify-between px-1">
            <div className="flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
              <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
              <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
            </div>
            <p className="text-[9px] font-medium tracking-wide text-slate-400">WhatsApp dashboard</p>
            <span className="h-1.5 w-8 rounded-full bg-slate-700" />
          </div>
          <div className="overflow-hidden rounded-t-md bg-[#F8FAFC]">
            <div className="grid grid-cols-[72px_1fr]">
              <div className="space-y-3 bg-white px-2.5 py-3">
                {['WA', 'Inbox', 'Leads', 'API'].map((item, index) => (
                  <div
                    key={item}
                    className={`rounded-md px-1.5 py-1 text-[8px] font-semibold ${
                      index === 0 ? 'bg-orange-50 text-secondary' : 'text-slate-400'
                    }`}
                  >
                    {item}
                  </div>
                ))}
              </div>
              <div className="space-y-2 p-3">
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label: 'Sent', value: '12.4k' },
                    { label: 'Delivered', value: '98%' },
                    { label: 'Replies', value: '2.1k' },
                  ].map((card) => (
                    <div key={card.label} className="rounded-md border border-slate-100 bg-white px-2 py-1.5">
                      <p className="text-[8px] text-slate-400">{card.label}</p>
                      <p className="text-[11px] font-bold text-slate-900">{card.value}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-md border border-slate-100 bg-white px-2 py-2">
                  <div className="mb-1.5 flex items-end gap-1 h-14">
                    {[28, 40, 32, 52, 44, 60, 48, 68, 56, 72].map((h, i) => (
                      <span
                        key={i}
                        className="flex-1 rounded-sm bg-gradient-to-t from-secondary/80 to-orange-300"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                  <p className="text-[8px] text-slate-400">Messages this week</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="relative h-3 rounded-b-xl bg-slate-200 shadow-inner">
          <div className="absolute left-1/2 top-1 h-1 w-16 -translate-x-1/2 rounded-full bg-slate-300" />
        </div>
        <div className="mx-auto h-2 w-[70%] rounded-b-lg bg-slate-300" />
      </div>

      <div className="absolute -bottom-3 left-4 hidden h-16 w-8 rounded-t-lg border border-slate-300 bg-slate-900 shadow-lg sm:block">
        <div className="m-1 h-[78%] rounded-sm bg-slate-100" />
      </div>
    </div>
  );
}

function WhatsAppGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.27-1.38a9.86 9.86 0 0 0 4.77 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.91-7.01z"
      />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.78-9.72a.75.75 0 00-1.06-1.06L9 10.94 7.28 9.22a.75.75 0 10-1.06 1.06l2.25 2.25a.75.75 0 001.06 0l4.25-4.25z"
        clipRule="evenodd"
      />
    </svg>
  );
}
