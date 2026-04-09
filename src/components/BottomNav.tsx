"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/",           label: "Home",       icon: HomeIcon       },
  { href: "/scan",       label: "Scanner",    icon: ScannerIcon    },
  { href: "/collection", label: "Collection", icon: CollectionIcon },
  { href: "/market",     label: "Market",     icon: MarketIcon     },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 w-full z-50 flex justify-around items-center h-20 px-4"
      style={{
        background: "rgba(14,14,14,0.75)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        boxShadow: "0 -10px 30px rgba(0,0,0,0.5)",
      }}
    >
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center justify-center gap-1 px-4 py-1 rounded-xl transition-all active:scale-90 duration-200"
            style={
              active
                ? { color: "#ffc32c", background: "rgba(255,195,44,0.08)" }
                : { color: "#71717a" }
            }
          >
            <Icon active={active} />
            <span
              className="text-[10px] font-semibold uppercase tracking-widest mt-0.5"
              style={{ fontFamily: "'Space Grotesk', var(--font-space-grotesk), sans-serif" }}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "#ffc32c" : "none"} stroke={active ? "none" : "#71717a"} strokeWidth="1.8">
      {active ? (
        <path d="M3 13h2v-2H3v2zm0 4h2v-4H3v4zm0-8h2V7H3v2zm4 8h2v-2H7v2zm0-4h2v-2H7v2zm0-4h2V7H7v2zm4 8h2v-2h-2v2zm0-4h2v-2h-2v2zm0-4h2V7h-2v2zm4 8h2v-2h-2v2zm0-4h2v-2h-2v2zm0-4h2V7h-2v2z" fill="#ffc32c"/>
      ) : (
        <>
          <rect x="3" y="3" width="7" height="7" rx="1.5"/>
          <rect x="14" y="3" width="7" height="7" rx="1.5"/>
          <rect x="3" y="14" width="7" height="7" rx="1.5"/>
          <rect x="14" y="14" width="7" height="7" rx="1.5"/>
        </>
      )}
    </svg>
  );
}

function ScannerIcon({ active }: { active: boolean }) {
  const c = active ? "#ffc32c" : "#71717a";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={c}>
      <path d="M5 15H3v4c0 1.1.9 2 2 2h4v-2H5v-4zm0-10h4V3H5C3.9 3 3 3.9 3 5v4h2V5zm14-2h-4v2h4v4h2V5c0-1.1-.9-2-2-2zm0 16h-4v2h4c1.1 0 2-.9 2-2v-4h-2v4zM12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
    </svg>
  );
}

function CollectionIcon({ active }: { active: boolean }) {
  const c = active ? "#ffc32c" : "#71717a";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={c}>
      <path d="M20 2H4c-1 0-2 .9-2 2v3.01c0 .72.43 1.34 1 1.72V20c0 1.1 1.1 2 2 2h14c.9 0 2-.9 2-2V8.72c.57-.38 1-.99 1-1.71V4c0-1.1-1-2-2-2zm-5 12H9v-2h6v2zm5-8H4V4l16-.01V6z"/>
    </svg>
  );
}

function MarketIcon({ active }: { active: boolean }) {
  const c = active ? "#ffc32c" : "#71717a";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={c}>
      <path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99l1.5 1.5z"/>
    </svg>
  );
}
