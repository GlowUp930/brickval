"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNav() {
  const pathname = usePathname();

  const tabs = [
    { href: "/", label: "Home", icon: HomeIcon },
    { href: "/scan", label: "Scan", icon: ScanIcon },
    { href: "/settings", label: "Settings", icon: SettingsIcon },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 flex items-center justify-around px-6 pt-3 pb-8 border-t z-50"
      style={{ background: "rgba(13,13,15,0.97)", borderColor: "var(--border)", backdropFilter: "blur(20px)" }}
    >
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1 min-w-[60px] py-1"
          >
            <Icon active={active} />
            <span
              className="text-[10px] font-semibold tracking-wide"
              style={{ color: active ? "var(--accent)" : "var(--muted)" }}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  const color = active ? "var(--accent)" : "#6b6b7a";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="7.5" height="7.5" rx="2" fill={active ? "rgba(245,197,24,0.18)" : "none"} stroke={color} strokeWidth="1.7"/>
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" fill={active ? "rgba(245,197,24,0.18)" : "none"} stroke={color} strokeWidth="1.7"/>
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" fill={active ? "rgba(245,197,24,0.18)" : "none"} stroke={color} strokeWidth="1.7"/>
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" fill={active ? "rgba(245,197,24,0.18)" : "none"} stroke={color} strokeWidth="1.7"/>
    </svg>
  );
}

function ScanIcon({ active }: { active: boolean }) {
  const color = active ? "var(--accent)" : "#6b6b7a";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M4 9 L4 4 L9 4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M15 4 L20 4 L20 9" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 15 L4 20 L9 20" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M15 20 L20 20 L20 15" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="12" r="2.8" fill={active ? "rgba(245,197,24,0.2)" : "none"} stroke={color} strokeWidth="1.7"/>
    </svg>
  );
}

function SettingsIcon({ active }: { active: boolean }) {
  const color = active ? "var(--accent)" : "#6b6b7a";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="2.8" stroke={color} strokeWidth="1.7"/>
      <path
        d="M12 2.5v2M12 19.5v2M4.4 4.4l1.4 1.4M18.2 18.2l1.4 1.4M2.5 12h2M19.5 12h2M4.4 19.6l1.4-1.4M18.2 5.8l1.4-1.4"
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
