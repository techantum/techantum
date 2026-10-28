export default function HookoohAvatar({ size = 48, pulse = false }: { size?: number; pulse?: boolean }) {
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      {pulse ? <span className="absolute inset-0 rounded-full bg-violet-400/40 animate-ping" /> : null}
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden className="relative drop-shadow-md">
        <defs>
          <linearGradient id="hookoohBody" x1="12" y1="8" x2="52" y2="58">
            <stop offset="0%" stopColor="#C4B5FD" />
            <stop offset="55%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#4C1D95" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="30" fill="url(#hookoohBody)" />
        <rect x="18" y="10" width="28" height="6" rx="3" fill="#EDE9FE" />
        <circle cx="32" cy="8" r="3.5" fill="#DDD6FE" />
        <circle cx="32" cy="8" r="1.6" fill="#A78BFA" />
        <rect x="16" y="22" width="32" height="26" rx="12" fill="#F5F3FF" />
        <circle cx="24.5" cy="34" r="4.2" fill="#4C1D95" />
        <circle cx="39.5" cy="34" r="4.2" fill="#4C1D95" />
        <circle cx="25.6" cy="32.8" r="1.4" fill="#F5F3FF" className={pulse ? 'origin-center animate-pulse' : ''} />
        <circle cx="40.6" cy="32.8" r="1.4" fill="#F5F3FF" className={pulse ? 'origin-center animate-pulse' : ''} />
        <path d="M26 42c2.2 2.4 9.8 2.4 12 0" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="34" r="3" fill="#A78BFA" />
        <circle cx="52" cy="34" r="3" fill="#A78BFA" />
      </svg>
    </span>
  );
}
