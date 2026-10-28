export default function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[280px] items-center justify-center" role="status" aria-live="polite">
      <style>{`
        @keyframes yt-bar {
          0%, 100% { height: 22%; }
          50% { height: 100%; }
        }
        @keyframes yt-scan {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(220%); }
        }
        @keyframes yt-dot {
          0%, 100% { opacity: .35; transform: scale(.85); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex h-[4.5rem] w-[4.5rem] items-end justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-violet-50 to-sky-50 p-3 ring-1 ring-violet-100">
          <span className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-transparent via-white/80 to-transparent" style={{ animation: 'yt-scan 1.4s ease-in-out infinite' }} />
          {[0, 1, 2, 3, 4].map((index) => (
            <span
              key={index}
              className="mx-[2px] w-1.5 rounded-full bg-gradient-to-t from-violet-600 to-sky-400"
              style={{ animation: `yt-bar 1s ease-in-out ${index * 0.12}s infinite`, height: '40%' }}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500" style={{ animation: 'yt-dot 1.2s ease-in-out infinite' }} />
          <p className="text-sm font-medium text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  );
}
