"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BadgeDollarSign, Camera, Database, Keyboard, Mail, ScanLine, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { joinWaitlist } from "@/app/waitlist-action";

const appStoreUrl = "https://apps.apple.com/au/app/brickvalue/id6771715475";

const showcaseScreens = [
  {
    src: "/demo/minifig-scan.png",
    alt: "BrickVal camera scanner focused on a LEGO minifigure",
    title: "Scan",
    body: "Use the camera for sets and minifigures.",
  },
  {
    src: "/demo/set-result.png",
    alt: "BrickVal price result screen for a LEGO set",
    title: "Price",
    body: "See the current USD market value.",
  },
  {
    src: "/demo/portfolio.png",
    alt: "BrickVal collection value screen with saved LEGO inventory",
    title: "Save",
    body: "Keep a cleaner view of collection value.",
  },
];

const proofItems = [
  {
    icon: Database,
    title: "BrickLink first",
    body: "Sold price guide data is the main signal when it is available.",
  },
  {
    icon: ShieldCheck,
    title: "eBay cross-check",
    body: "Marketplace listings and sold data help catch wider demand.",
  },
  {
    icon: ScanLine,
    title: "Built for quick checks",
    body: "Photo scan, upload, or manual set number entry all lead to the same result.",
  },
];

const demoVideo = {
  src: "/demo/brickval-demo.mp4",
  poster: "/demo/brickval-demo-poster.jpg",
};

const heroFeatures = [
  {
    icon: Camera,
    title: "Photo scan",
    body: "Point at the LEGO box.",
  },
  {
    icon: Keyboard,
    title: "Manual lookup",
    body: "Enter the set number.",
  },
  {
    icon: BadgeDollarSign,
    title: "USD values",
    body: "Reveal market pricing.",
  },
];

const launchPlatforms = [
  {
    name: "BetaList",
    logo: "/demo/betalist.svg",
  },
  {
    name: "TinyLaunch",
    logo: "/demo/tinylaunch.svg",
  },
  {
    name: "Uneed",
    logo: "/demo/uneed.svg",
  },
];

function AppStoreLink({ className = "" }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.a
      href={appStoreUrl}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex min-h-14 items-center justify-center rounded-[16px] transition ${className}`}
      style={{ boxShadow: "0 18px 44px -26px rgba(255,255,255,0.64)" }}
      whileHover={reduceMotion ? undefined : { y: -2 }}
      whileTap={reduceMotion ? undefined : { scale: 0.98 }}
      aria-label="Download BrickValue on the App Store"
    >
      <Image
        src="/demo/app-store-badge.webp"
        alt="Download on the App Store"
        width={654}
        height={219}
        sizes="(max-width: 640px) 210px, 230px"
        className="h-14 w-auto sm:h-[58px]"
      />
    </motion.a>
  );
}

function StudField() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute right-[-8rem] top-24 grid rotate-[-12deg] grid-cols-8 gap-4 opacity-[0.09] sm:right-0 sm:top-20">
        {Array.from({ length: 48 }).map((_, index) => (
          <span key={index} className="h-6 w-6 rounded-full" style={{ background: "var(--accent)" }} />
        ))}
      </div>
    </div>
  );
}

function PhoneFrame({
  screen,
  index,
  className = "",
  priority = false,
}: {
  screen: (typeof showcaseScreens)[number];
  index: number;
  className?: string;
  priority?: boolean;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.figure
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 28, rotate: index === 1 ? 2 : -2 }}
      whileInView={{ opacity: 1, y: 0, rotate: index === 1 ? 2 : -2 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.52, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className={`group ${className}`}
    >
      <div
        className="relative overflow-hidden rounded-[2.2rem] p-1.5 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-1"
        style={{
          background: "linear-gradient(145deg, rgba(255,255,255,0.28), rgba(245,202,65,0.18) 34%, rgba(12,14,12,0.96) 72%)",
          boxShadow: "0 32px 80px -42px rgba(0,0,0,0.96)",
        }}
      >
        <div className="overflow-hidden rounded-[1.9rem]" style={{ background: "var(--surface)" }}>
          <Image
            src={screen.src}
            alt={screen.alt}
            width={409}
            height={849}
            sizes="(max-width: 768px) 70vw, 280px"
            className="h-auto w-full"
            priority={priority}
          />
        </div>
      </div>
      <figcaption className="mt-4 max-w-[15rem]">
        <span className="block text-lg font-black">{screen.title}</span>
        <span className="mt-1 block text-sm leading-6" style={{ color: "var(--muted-strong)" }}>
          {screen.body}
        </span>
      </figcaption>
    </motion.figure>
  );
}

function HeroStage({ reduceMotion }: { reduceMotion: boolean | null }) {
  return (
    <motion.div
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, x: 34, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.7, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
      className="relative hidden min-h-[560px] overflow-hidden rounded-[8px] border md:block lg:min-h-[620px]"
      style={{
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.065), rgba(255,255,255,0.018) 42%, rgba(245,202,65,0.08))",
        borderColor: "var(--border)",
      }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(rgba(245,202,65,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(245,202,65,0.07)_1px,transparent_1px)] bg-[size:42px_42px]" />
      <div className="absolute left-8 top-8 max-w-[15rem]">
        <p className="text-sm font-bold leading-6" style={{ color: "var(--muted-strong)" }}>
          iOS app launches 21 June 2026. Web scanner is live today.
        </p>
      </div>
      <div className="absolute bottom-8 left-8 w-[250px] lg:w-[300px]">
        <PhoneFrame screen={showcaseScreens[0]} index={0} priority />
      </div>
      <div className="absolute right-8 top-16 w-[250px] lg:right-12 lg:w-[300px]">
        <PhoneFrame screen={showcaseScreens[1]} index={1} priority />
      </div>
    </motion.div>
  );
}

function DemoVideo() {
  const reduceMotion = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const isVisibleRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (reduceMotion) {
      video.pause();
      return;
    }

    const playVideo = () => {
      void video.play().catch(() => {});
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
        if (entry.isIntersecting) {
          playVideo();
        } else {
          video.pause();
        }
      },
      { threshold: 0.35 },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [reduceMotion]);

  return (
    <motion.figure
      initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto max-w-5xl overflow-hidden rounded-none border-y border-x-0 sm:rounded-[8px] sm:border"
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(245,202,65,0.035))",
        borderColor: "var(--border)",
      }}
    >
      <div className="relative">
        <video
          ref={videoRef}
          className="aspect-[4/5] w-full bg-white object-cover sm:aspect-video sm:object-contain"
          muted
          loop
          playsInline
          preload="auto"
          poster={demoVideo.poster}
          aria-label="BrickValue iOS app demo"
          onLoadedData={(event) => {
            if (!reduceMotion && isVisibleRef.current) void event.currentTarget.play();
          }}
        >
          <source src={demoVideo.src} type="video/mp4" />
        </video>
      </div>
      <figcaption className="flex flex-col gap-4 border-t p-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "var(--border)" }}>
        <div>
          <h3 className="text-2xl font-black tracking-normal">iOS app demo</h3>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6" style={{ color: "var(--muted-strong)" }}>
            Scan, reveal the market price, and save a LEGO item to your collection.
          </p>
        </div>
        <AppStoreLink className="min-h-12 px-5" />
      </figcaption>
    </motion.figure>
  );
}

function HeroFeatureStrip({ reduceMotion }: { reduceMotion: boolean | null }) {
  return (
    <motion.div
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.52, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
      className="-mx-5 w-[calc(100%+2.5rem)] max-w-[calc(100%+2.5rem)] overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:w-full sm:max-w-xl sm:overflow-visible sm:px-0"
    >
      <div className="flex w-max gap-3 sm:grid sm:w-full sm:grid-cols-3">
        {heroFeatures.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.title}
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, delay: 0.2 + index * 0.06, ease: [0.16, 1, 0.3, 1] }}
              className="flex min-w-[9.5rem] flex-col items-start gap-3 rounded-[8px] border p-3.5 sm:min-w-0 sm:gap-4 sm:px-4 sm:py-3"
              style={{ borderColor: "var(--border)", background: index === 0 ? "rgba(245,202,65,0.08)" : "rgba(255,255,255,0.025)" }}
            >
              <span
                className="flex h-11 w-11 items-center justify-center rounded-[8px]"
                style={{ background: index === 0 ? "rgba(245,202,65,0.18)" : "rgba(255,255,255,0.055)", color: "var(--accent)" }}
              >
                <Icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-black leading-5">{item.title}</span>
                <span className="mt-1 block text-xs font-semibold leading-5 sm:hidden" style={{ color: "var(--muted-strong)" }}>
                  {item.body}
                </span>
              </span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

function LaunchPlatformMarquee() {
  const reduceMotion = useReducedMotion();
  const logos = [...launchPlatforms, ...launchPlatforms, ...launchPlatforms];

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
      className="relative mx-auto mt-10 max-w-7xl overflow-hidden rounded-[8px] border py-4 sm:mt-12"
      style={{ background: "rgba(255,255,255,0.026)", borderColor: "var(--border)" }}
      aria-label="Launch platforms featuring BrickVal"
    >
      <div className="mb-3 px-4 text-center text-xs font-black uppercase tracking-[0.16em]" style={{ color: "var(--muted-strong)" }}>
        As seen in
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[var(--background)] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[var(--background)] to-transparent" />
      <div className="launch-marquee-track flex w-max items-center gap-3 px-3">
        {logos.map((platform, index) => (
          <div
            key={`${platform.name}-${index}`}
            className="flex h-16 min-w-[190px] items-center justify-center rounded-full border px-6"
            style={{ background: "rgba(13,15,13,0.58)", borderColor: "rgba(255,255,255,0.1)" }}
            aria-hidden={index >= launchPlatforms.length}
          >
            <Image
              src={platform.logo}
              alt={index < launchPlatforms.length ? platform.name : ""}
              width={170}
              height={40}
              className="h-8 w-auto max-w-[150px]"
              unoptimized
            />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export function Hero() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "duplicate" | "error">("idle");
  const reduceMotion = useReducedMotion();

  const reveal = (delay = 0) => ({
    initial: reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-80px" },
    transition: { duration: 0.48, delay, ease: [0.16, 1, 0.3, 1] as const },
  });

  async function handleWaitlist() {
    if (!email || status === "loading") return;

    setStatus("loading");
    const result = await joinWaitlist(email);

    if (result.ok && result.duplicate) setStatus("duplicate");
    else if (result.ok) setStatus("success");
    else setStatus("error");
  }

  return (
    <main className="min-h-dvh w-full max-w-full overflow-x-hidden" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      <nav
        className="fixed left-0 right-0 top-0 z-50 border-b px-5 py-4 backdrop-blur-xl sm:px-8"
        style={{ background: "rgba(12,14,12,0.78)", borderColor: "var(--border)" }}
      >
        <div className="mx-auto flex h-10 w-full max-w-7xl items-center justify-between gap-4">
          <BrandMark iconClassName="h-8 w-8" textClassName="text-base" />
          <motion.div whileHover={reduceMotion ? undefined : { y: -1 }} whileTap={reduceMotion ? undefined : { scale: 0.98 }}>
            <Link
              href="/scan"
              className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full px-5 text-sm font-black transition"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              Try web app
            </Link>
          </motion.div>
        </div>
      </nav>

      <section className="relative px-5 pb-14 pt-24 sm:px-8 md:pb-20 lg:pt-28">
        <StudField />
        <div className="relative mx-auto grid max-w-7xl gap-10 md:grid-cols-[0.86fr_1.14fr] md:items-center">
          <div className="flex w-full max-w-3xl flex-col items-start gap-5 sm:gap-6">
            <motion.div
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col gap-4"
            >
              <div className="inline-flex w-fit rounded-full border px-4 py-2 text-sm font-black" style={{ borderColor: "rgba(245,202,65,0.3)", background: "rgba(245,202,65,0.09)", color: "var(--accent)" }}>
                iOS app launches 21 June 2026
              </div>
              <h1 className="max-w-[20rem] font-display text-[clamp(2.85rem,12vw,5.35rem)] font-black leading-[0.95] tracking-normal sm:max-w-3xl sm:text-[clamp(3rem,7vw,5.35rem)]">
                Know your LEGO value.
              </h1>
              <p className="max-w-[20.5rem] text-base font-semibold leading-7 sm:max-w-[34rem] sm:text-lg sm:leading-8" style={{ color: "var(--muted-strong)" }}>
                Pre-order the iOS app, or scan now with the live web version.
              </p>
            </motion.div>

            <motion.div
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.52, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="flex w-full max-w-[20.5rem] flex-col gap-3 sm:max-w-lg sm:flex-row"
            >
              <AppStoreLink className="w-full sm:flex-1" />
              <motion.div className="flex-1" whileHover={reduceMotion ? undefined : { y: -2 }} whileTap={reduceMotion ? undefined : { scale: 0.98 }}>
                <Link
                  href="/scan"
                  className="flex min-h-14 items-center justify-center rounded-full px-7 text-base font-black transition"
                  style={{ background: "rgba(255,255,255,0.045)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                >
                  Try web app
                </Link>
              </motion.div>
            </motion.div>

            <HeroFeatureStrip reduceMotion={reduceMotion} />
          </div>

          <HeroStage reduceMotion={reduceMotion} />
        </div>
        <LaunchPlatformMarquee />
      </section>

      <section id="demo" className="px-0 py-20 sm:px-8 lg:py-28" style={{ background: "var(--surface)" }}>
        <div className="mx-auto max-w-7xl">
          <motion.div {...reveal()} className="mx-auto mb-10 max-w-3xl px-5 text-center sm:mb-12 sm:px-0">
            <h2 className="font-display text-3xl font-black leading-[1] tracking-normal sm:text-6xl">
              See the iOS app before launch.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base font-semibold leading-7" style={{ color: "var(--muted-strong)" }}>
              A 32-second preview of the scan, price reveal, and collection save flow.
            </p>
          </motion.div>
          <DemoVideo />
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <motion.div {...reveal()} className="mb-10 max-w-2xl">
            <h2 className="font-display text-3xl font-black leading-[1] tracking-normal sm:text-6xl">
              Prices need evidence.
            </h2>
            <p className="mt-5 text-base font-semibold leading-7" style={{ color: "var(--muted-strong)" }}>
              BrickVal checks the places LEGO collectors already trade.
            </p>
          </motion.div>
          <div className="grid gap-4 md:grid-cols-3">
            {proofItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  {...reveal(0.06 + index * 0.06)}
                  className="rounded-[8px] border p-5"
                  style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                  whileHover={reduceMotion ? undefined : { y: -4, borderColor: "rgba(245,202,65,0.34)" }}
                  transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-[8px]" style={{ background: "rgba(245,202,65,0.11)", color: "var(--accent)" }}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-8 text-xl font-black">{item.title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-6" style={{ color: "var(--muted)" }}>
                    {item.body}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="beta" className="px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
          <motion.div {...reveal()} className="rounded-[8px] border p-6 sm:p-8" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <h2 className="font-display text-3xl font-black leading-[1] tracking-normal sm:text-6xl">
              Help shape the mobile app.
            </h2>
            <p className="mt-5 max-w-xl text-base font-semibold leading-7" style={{ color: "var(--muted-strong)" }}>
              The web scanner is open now. We want early mobile testers who collect, buy, sell, or track LEGO value.
            </p>
            <div className="mt-10 grid gap-3">
              {["Early invite by email", "Test real set and minifigure scans", "Give feedback before launch"].map((item) => (
                <div key={item} className="rounded-[8px] border px-4 py-4 text-sm font-black" style={{ borderColor: "var(--border)", background: "rgba(255,255,255,0.025)" }}>
                  {item}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            {...reveal(0.08)}
            className="flex flex-col justify-between rounded-[8px] border p-6 sm:p-8"
            style={{
              background: "linear-gradient(155deg, rgba(245,202,65,0.14), rgba(255,255,255,0.04) 38%, rgba(255,255,255,0.02))",
              borderColor: "rgba(245,202,65,0.25)",
            }}
          >
            <div className="mb-10 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-[8px]" style={{ background: "rgba(245,202,65,0.12)", color: "var(--accent)" }}>
                <Mail className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="text-sm font-bold leading-6" style={{ color: "var(--muted-strong)" }}>
                No pricing pitch here. Just beta access when the next test batch opens.
              </p>
            </div>

            <AnimatePresence mode="wait">
              {status === "success" ? (
                <motion.div
                  key="success"
                  initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-[8px] px-5 py-5 text-base font-black leading-7"
                  style={{ background: "rgba(98,211,158,0.14)", color: "var(--green)", border: "1px solid rgba(98,211,158,0.32)" }}
                >
                  You are on the list. We will email your beta invite when your batch opens.
                </motion.div>
              ) : status === "duplicate" ? (
                <motion.div
                  key="duplicate"
                  initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-[8px] px-5 py-5 text-base font-black leading-7"
                  style={{ background: "rgba(245,202,65,0.12)", color: "var(--accent)", border: "1px solid rgba(245,202,65,0.32)" }}
                >
                  You are already on the beta list. The invite link comes by email.
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-3"
                >
                  <label htmlFor="beta-email" className="text-sm font-black">
                    Email address
                  </label>
                  <input
                    id="beta-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && handleWaitlist()}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="min-h-14 w-full rounded-full px-6 py-4 text-base font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    style={{
                      background: "var(--background)",
                      color: "var(--foreground)",
                      border: "1px solid var(--border)",
                    }}
                  />
                  <motion.button
                    type="button"
                    onClick={handleWaitlist}
                    disabled={status === "loading"}
                    className="min-h-14 w-full rounded-full px-7 py-4 text-base font-black transition disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
                    style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
                    whileHover={reduceMotion || status === "loading" ? undefined : { y: -2 }}
                    whileTap={reduceMotion || status === "loading" ? undefined : { scale: 0.98 }}
                  >
                    {status === "loading" ? "Joining..." : "Join beta"}
                  </motion.button>
                  {status === "error" && (
                    <p className="text-sm font-bold" style={{ color: "var(--red)" }} role="alert">
                      We could not save your email. Try again in a moment.
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      <footer className="border-t px-5 py-8 text-center sm:px-8" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <BrandMark iconClassName="h-8 w-8" textClassName="text-base" />
          <div className="flex flex-col items-center gap-2 sm:items-end">
            <p className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
              &copy; 2026 BrickVal. Built for LEGO collectors.
            </p>
            <Link href="/privacy" className="text-xs font-semibold underline underline-offset-4 transition hover:opacity-80" style={{ color: "var(--foreground)" }}>
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
