"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  BadgeDollarSign,
  Box,
  Camera,
  Database,
  Keyboard,
  Mail,
  ScanLine,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { joinWaitlist } from "@/app/waitlist-action";
import { BrandMark } from "@/components/BrandMark";

const appStoreUrl = "https://apps.apple.com/au/app/brickvalue/id6771715475";

const demoVideo = {
  src: "/demo/brickval-demo.mp4",
  poster: "/demo/brickval-demo-poster.jpg",
};

const heroScreens = [
  {
    src: "/demo/minifig-scan.png",
    alt: "BrickVal scanner screen focused on a LEGO minifigure",
  },
  {
    src: "/demo/set-result.png",
    alt: "BrickVal result screen showing a LEGO set value",
  },
];

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

const proofItems = [
  {
    icon: Database,
    title: "BrickLink first",
    body: "Sold price guide data is the main signal when available.",
  },
  {
    icon: ShieldCheck,
    title: "eBay cross-check",
    body: "Marketplace data helps catch wider demand and liquidity.",
  },
  {
    icon: ScanLine,
    title: "Fast set lookup",
    body: "Photo scan, upload, or set number entry use the same flow.",
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

const appScreens = [
  {
    src: "/demo/live-analysis.png",
    alt: "BrickVal live analysis screen",
    title: "Live scan",
  },
  {
    src: "/demo/set-details.png",
    alt: "BrickVal set details screen",
    title: "Set details",
  },
  {
    src: "/demo/portfolio.png",
    alt: "BrickVal collection portfolio screen",
    title: "Portfolio",
  },
];

function AppStoreLink({ className = "" }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.a
      href={appStoreUrl}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex min-h-12 items-center justify-center rounded-[18px] transition ${className}`}
      whileHover={reduceMotion ? undefined : { y: -2, scale: 1.01 }}
      whileTap={reduceMotion ? undefined : { scale: 0.98 }}
      aria-label="Download BrickValue on the App Store"
    >
      <Image
        src="/demo/app-store-badge.webp"
        alt="Download on the App Store"
        width={654}
        height={219}
        sizes="(max-width: 640px) 190px, 220px"
        className="h-12 w-auto sm:h-14"
      />
    </motion.a>
  );
}

function LegoBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute left-1/2 top-[-22rem] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-[color-mix(in_oklch,var(--accent)_16%,transparent)] blur-3xl" />
      <div className="absolute right-[-12rem] top-32 hidden rotate-[-14deg] grid-cols-7 gap-5 opacity-[0.18] sm:grid">
        {Array.from({ length: 49 }).map((_, index) => (
          <span
            key={index}
            className="h-9 w-9 rounded-full shadow-[inset_0_1px_0_rgb(255_255_255/.55),inset_0_-6px_12px_rgb(0_0_0/.08)]"
            style={{ background: "color-mix(in oklch, var(--accent) 72%, white)" }}
          />
        ))}
      </div>
      <div className="absolute bottom-[-16rem] left-[-10rem] h-[28rem] w-[28rem] rounded-full bg-[color-mix(in_oklch,var(--accent)_10%,transparent)] blur-3xl" />
    </div>
  );
}

function HeroDevice({ reduceMotion }: { reduceMotion: boolean | null }) {
  return (
    <motion.div
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 30, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
      className="relative mx-auto mt-4 grid w-full max-w-[34rem] place-items-center lg:mt-0 lg:max-w-none"
    >
      <div className="absolute inset-x-8 top-16 h-72 rounded-[44px] bg-[color-mix(in_oklch,var(--accent)_22%,white)] blur-3xl" />
      <div className="relative grid min-h-[33rem] w-full grid-cols-[0.8fr_1fr] items-center justify-center sm:min-h-[39rem]">
        {heroScreens.map((screen, index) => (
          <motion.figure
            key={screen.src}
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, x: index === 0 ? 20 : -20, rotate: index === 0 ? -5 : 5 }}
            animate={{ opacity: 1, x: 0, rotate: index === 0 ? -4 : 5 }}
            transition={{ duration: 0.74, delay: 0.18 + index * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className={`relative ${index === 0 ? "z-20 translate-x-7 self-end" : "z-10 -translate-x-8 self-start pt-7"}`}
          >
            <div className="rounded-[2rem] border border-black/10 bg-neutral-950 p-1.5 shadow-[0_36px_100px_rgb(39_38_31/.22)] sm:rounded-[2.6rem]">
              <div className="overflow-hidden rounded-[1.65rem] bg-black sm:rounded-[2.2rem]">
                <Image
                  src={screen.src}
                  alt={screen.alt}
                  width={409}
                  height={849}
                  sizes="(max-width: 768px) 46vw, 260px"
                  className="h-auto w-full"
                  priority
                />
              </div>
            </div>
          </motion.figure>
        ))}
        <motion.div
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.58, delay: 0.48, ease: [0.16, 1, 0.3, 1] }}
          className="absolute bottom-8 left-2 z-30 w-[13.5rem] rounded-[24px] border border-white/70 bg-white/74 p-4 shadow-[0_20px_70px_rgb(52_45_25/.2)] backdrop-blur-2xl sm:bottom-10 sm:left-12"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-[var(--accent)] text-[var(--accent-fg)] shadow-[inset_0_1px_0_rgb(255_255_255/.55)]">
              <Box className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-extrabold text-[var(--muted)]">Market value</p>
              <p className="font-display text-2xl font-black leading-none text-[var(--foreground)]">$428</p>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/10">
            <motion.div
              initial={reduceMotion ? { scaleX: 1 } : { scaleX: 0 }}
              animate={{ scaleX: 0.72 }}
              transition={{ duration: 0.7, delay: 0.68, ease: [0.16, 1, 0.3, 1] }}
              className="h-full origin-left rounded-full bg-[var(--accent)]"
            />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function FeatureRail({ reduceMotion }: { reduceMotion: boolean | null }) {
  return (
    <motion.div
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.52, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="grid w-full max-w-[35rem] gap-2 sm:grid-cols-3"
    >
      {heroFeatures.map((item, index) => {
        const Icon = item.icon;
        return (
          <div
            key={item.title}
            className="grid grid-cols-[2.75rem_1fr] items-center gap-3 rounded-[22px] border border-white/70 bg-white/64 p-3 shadow-[0_12px_34px_rgb(39_38_31/.08)] backdrop-blur-xl sm:grid-cols-1 sm:p-4"
          >
            <span
              className="grid h-11 w-11 place-items-center rounded-[16px]"
              style={{
                background: index === 0 ? "var(--accent)" : "color-mix(in oklch, var(--accent) 22%, white)",
                color: index === 0 ? "var(--accent-fg)" : "color-mix(in oklch, var(--accent) 72%, black)",
              }}
            >
              <Icon className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-black leading-5 text-[var(--foreground)]">{item.title}</span>
              <span className="mt-0.5 block text-xs font-bold leading-5 text-[var(--muted)]">{item.body}</span>
            </span>
          </div>
        );
      })}
    </motion.div>
  );
}

function LaunchPlatformBanner() {
  const reduceMotion = useReducedMotion();
  const logos = [...launchPlatforms, ...launchPlatforms, ...launchPlatforms];

  return (
    <motion.section
      initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-90px" }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto w-full max-w-7xl px-5 pb-12 sm:px-8 lg:pb-16"
      aria-label="Launch platforms featuring BrickVal"
    >
      <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white/66 py-4 shadow-[0_20px_70px_rgb(39_38_31/.08)] backdrop-blur-xl">
        <p className="mb-4 text-center text-xs font-black uppercase tracking-[0.16em] text-[var(--muted)]">As seen in</p>
        <div className="grid grid-cols-3 gap-2 px-3 sm:hidden">
          {launchPlatforms.map((platform) => (
            <div key={platform.name} className="flex h-14 min-w-0 items-center justify-center rounded-[20px] border border-black/10 bg-white/70 px-3">
              <Image src={platform.logo} alt={platform.name} width={132} height={36} className="max-h-7 w-auto max-w-full invert" unoptimized />
            </div>
          ))}
        </div>
        <div className="relative hidden sm:block">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-white/85 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-white/85 to-transparent" />
          <div className="launch-marquee-track flex w-max items-center gap-3 px-3">
            {logos.map((platform, index) => (
              <div
                key={`${platform.name}-${index}`}
                className="flex h-16 min-w-[210px] items-center justify-center rounded-[22px] border border-black/10 bg-white/74 px-8"
                aria-hidden={index >= launchPlatforms.length}
              >
                <Image
                  src={platform.logo}
                  alt={index < launchPlatforms.length ? platform.name : ""}
                  width={174}
                  height={44}
                  className="h-8 w-auto max-w-[152px] invert"
                  unoptimized
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
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

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
        if (entry.isIntersecting) {
          void video.play().catch(() => {});
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
      initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-90px" }}
      transition={{ duration: 0.56, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden rounded-[34px] border border-black/10 bg-white/74 shadow-[0_28px_90px_rgb(39_38_31/.12)] backdrop-blur-xl"
    >
      <div className="relative bg-[var(--surface)] p-2 sm:p-3">
        <video
          ref={videoRef}
          className="aspect-[4/5] w-full rounded-[26px] bg-white object-cover sm:aspect-video sm:object-contain"
          muted
          loop
          playsInline
          preload="metadata"
          poster={demoVideo.poster}
          aria-label="BrickValue iOS app demo"
          onLoadedData={(event) => {
            if (!reduceMotion && isVisibleRef.current) void event.currentTarget.play();
          }}
        >
          <source src={demoVideo.src} type="video/mp4" />
        </video>
      </div>
      <figcaption className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h3 className="font-display text-2xl font-black tracking-normal text-[var(--foreground)]">iOS app demo</h3>
          <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-[var(--muted)]">
            A 32-second preview of scan, price reveal, and collection save.
          </p>
        </div>
        <AppStoreLink className="justify-start sm:justify-center" />
      </figcaption>
    </motion.figure>
  );
}

function ScreenGallery({ reduceMotion }: { reduceMotion: boolean | null }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <motion.div
        initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-90px" }}
        transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-[34px] border border-black/10 bg-[var(--surface)] p-5 shadow-[0_24px_80px_rgb(39_38_31/.08)]"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          {appScreens.map((screen, index) => (
            <motion.figure
              key={screen.src}
              initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.45, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
              className="min-w-0"
            >
              <div className="overflow-hidden rounded-[28px] border border-black/10 bg-neutral-950 p-1.5">
                <Image src={screen.src} alt={screen.alt} width={409} height={849} sizes="(max-width: 640px) 72vw, 220px" className="h-auto w-full rounded-[22px]" />
              </div>
              <figcaption className="mt-3 text-sm font-black text-[var(--foreground)]">{screen.title}</figcaption>
            </motion.figure>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-90px" }}
        transition={{ duration: 0.52, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        className="grid content-between rounded-[34px] border border-black/10 bg-white/72 p-6 shadow-[0_24px_80px_rgb(39_38_31/.08)] backdrop-blur-xl sm:p-8"
      >
        <div>
          <div className="grid h-12 w-12 place-items-center rounded-[18px] bg-[var(--accent)] text-[var(--accent-fg)]">
            <Sparkles className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
          </div>
          <h2 className="mt-8 max-w-sm font-display text-3xl font-black leading-[1] tracking-normal text-[var(--foreground)] sm:text-5xl">
            Prices need evidence.
          </h2>
          <p className="mt-5 max-w-md text-base font-bold leading-7 text-[var(--muted)]">
            BrickVal checks the places LEGO collectors already trade, then turns the signal into a quick USD view.
          </p>
        </div>
        <div className="mt-10 grid gap-3">
          {proofItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="grid grid-cols-[2.6rem_1fr] items-start gap-3 rounded-[22px] border border-black/10 bg-[var(--surface)] p-4">
                <span className="grid h-10 w-10 place-items-center rounded-[15px] bg-white text-[var(--accent-fg)]">
                  <Icon className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-black text-[var(--foreground)]">{item.title}</span>
                  <span className="mt-1 block text-sm font-bold leading-6 text-[var(--muted)]">{item.body}</span>
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

export function Hero() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "duplicate" | "error">("idle");
  const reduceMotion = useReducedMotion();

  const reveal = (delay = 0) => ({
    initial: reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-90px" },
    transition: { duration: 0.52, delay, ease: [0.16, 1, 0.3, 1] as const },
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
    <main className="min-h-dvh w-full max-w-full overflow-x-hidden bg-[var(--background)] text-[var(--foreground)]">
      <nav className="fixed inset-x-0 top-0 z-50 px-4 py-4 sm:px-8">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 rounded-[24px] border border-white/70 bg-white/72 px-3 shadow-[0_14px_50px_rgb(39_38_31/.1)] backdrop-blur-2xl sm:px-4">
          <BrandMark iconClassName="h-9 w-9" textClassName="text-lg" />
          <motion.div whileHover={reduceMotion ? undefined : { y: -1 }} whileTap={reduceMotion ? undefined : { scale: 0.98 }}>
            <Link
              href="/scan"
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-[18px] bg-[var(--accent)] px-5 text-sm font-black text-[var(--accent-fg)] shadow-[inset_0_1px_0_rgb(255_255_255/.6)] transition"
            >
              Try web app
            </Link>
          </motion.div>
        </div>
      </nav>

      <section className="relative px-5 pb-10 pt-28 sm:px-8 lg:min-h-[100dvh] lg:pb-0 lg:pt-28">
        <LegoBackdrop />
        <div className="relative mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
          <div className="flex max-w-3xl flex-col items-start gap-5">
            <motion.div
              initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.56, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex max-w-full items-center rounded-[18px] border border-black/10 bg-white/68 px-3.5 py-2 text-sm font-black text-[color-mix(in_oklch,var(--accent)_72%,black)] shadow-[0_10px_34px_rgb(39_38_31/.08)] backdrop-blur-xl"
            >
              iOS app launches 21 June 2026
            </motion.div>

            <motion.div
              initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.58, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
              className="grid gap-5"
            >
              <h1 className="max-w-[11ch] font-display text-[clamp(3.4rem,14vw,7.6rem)] font-black leading-[0.9] tracking-normal text-[var(--foreground)] sm:max-w-[12ch] lg:max-w-[12.5ch] lg:text-[clamp(4.8rem,6.1vw,6.4rem)]">
                Know your LEGO value.
              </h1>
              <p className="max-w-[32rem] text-lg font-bold leading-8 text-[var(--muted)] sm:text-xl sm:leading-9">
                Pre-order the iOS app, or scan now with the live web version.
              </p>
            </motion.div>

            <motion.div
              initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.56, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="flex w-full max-w-[32rem] flex-col gap-3 sm:flex-row sm:items-center"
            >
              <AppStoreLink className="justify-start" />
              <motion.div whileHover={reduceMotion ? undefined : { y: -2 }} whileTap={reduceMotion ? undefined : { scale: 0.98 }} className="sm:flex-1">
                <Link
                  href="/scan"
                  className="flex min-h-14 items-center justify-center rounded-[20px] border border-black/10 bg-[var(--foreground)] px-7 text-base font-black text-white shadow-[0_18px_44px_rgb(20_20_20/.16)] transition"
                >
                  Try web app
                </Link>
              </motion.div>
            </motion.div>

            <FeatureRail reduceMotion={reduceMotion} />
          </div>

          <HeroDevice reduceMotion={reduceMotion} />
        </div>
      </section>

      <LaunchPlatformBanner />

      <section id="demo" className="px-5 py-16 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <motion.div {...reveal()} className="mb-8 max-w-3xl">
            <h2 className="font-display text-4xl font-black leading-[0.96] tracking-normal text-[var(--foreground)] sm:text-6xl">
              See the iOS app before launch.
            </h2>
            <p className="mt-5 max-w-2xl text-base font-bold leading-7 text-[var(--muted)]">
              The demo video starts when it enters view, so visitors see the product without tapping a play button.
            </p>
          </motion.div>
          <DemoVideo />
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <ScreenGallery reduceMotion={reduceMotion} />
        </div>
      </section>

      <section id="beta" className="px-5 py-16 sm:px-8 lg:py-24">
        <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <motion.div
            {...reveal()}
            className="rounded-[34px] border border-black/10 bg-[var(--foreground)] p-6 text-white shadow-[0_24px_80px_rgb(39_38_31/.16)] sm:p-8"
          >
            <h2 className="font-display text-4xl font-black leading-[0.96] tracking-normal sm:text-6xl">
              Be First To Know.
            </h2>
            <p className="mt-5 max-w-xl text-base font-bold leading-7 text-white/72">
              Get the next mobile test invite and help shape the scanner before broader launch.
            </p>
            <div className="mt-10 grid gap-3">
              {["Early invite by email", "Test real set and minifigure scans", "Android coming soon"].map((item) => (
                <div key={item} className="rounded-[22px] border border-white/12 bg-white/8 px-4 py-4 text-sm font-black text-white/88">
                  {item}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            {...reveal(0.08)}
            className="flex flex-col justify-between rounded-[34px] border border-black/10 bg-white/76 p-6 shadow-[0_24px_80px_rgb(39_38_31/.1)] backdrop-blur-xl sm:p-8"
          >
            <div className="mb-10 flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] bg-[var(--accent)] text-[var(--accent-fg)]">
                <Mail className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
              </span>
              <p className="text-sm font-bold leading-6 text-[var(--muted)]">
                No pricing pitch here. Just a short email when the next test batch opens.
              </p>
            </div>

            <AnimatePresence mode="wait">
              {status === "success" ? (
                <motion.div
                  key="success"
                  initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-[22px] border border-[color-mix(in_oklch,var(--green)_30%,white)] bg-[color-mix(in_oklch,var(--green)_14%,white)] px-5 py-5 text-base font-black leading-7 text-[color-mix(in_oklch,var(--green)_70%,black)]"
                >
                  You are on the list. We will email your beta invite when your batch opens.
                </motion.div>
              ) : status === "duplicate" ? (
                <motion.div
                  key="duplicate"
                  initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-[22px] border border-black/10 bg-[color-mix(in_oklch,var(--accent)_20%,white)] px-5 py-5 text-base font-black leading-7 text-[var(--accent-fg)]"
                >
                  You are already on the beta list. The invite link comes by email.
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="grid gap-3"
                >
                  <label htmlFor="beta-email" className="text-sm font-black text-[var(--foreground)]">
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
                    className="min-h-14 w-full rounded-[20px] border border-black/10 bg-white px-5 py-4 text-base font-bold text-[var(--foreground)] outline-none transition placeholder:text-[color-mix(in_oklch,var(--muted)_65%,white)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  />
                  <motion.button
                    type="button"
                    onClick={handleWaitlist}
                    disabled={status === "loading"}
                    className="min-h-14 w-full rounded-[20px] bg-[var(--accent)] px-7 py-4 text-base font-black text-[var(--accent-fg)] shadow-[inset_0_1px_0_rgb(255_255_255/.65)] transition disabled:cursor-not-allowed disabled:opacity-60"
                    whileHover={reduceMotion || status === "loading" ? undefined : { y: -2 }}
                    whileTap={reduceMotion || status === "loading" ? undefined : { scale: 0.98 }}
                  >
                    {status === "loading" ? "Joining..." : "Join beta"}
                  </motion.button>
                  {status === "error" && (
                    <p className="text-sm font-bold text-[var(--red)]" role="alert">
                      We could not save your email. Try again in a moment.
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      <footer className="px-5 py-8 text-center sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 border-t border-black/10 pt-8 sm:flex-row sm:justify-between">
          <BrandMark iconClassName="h-8 w-8" textClassName="text-base" />
          <div className="flex flex-col items-center gap-2 sm:items-end">
            <p className="text-xs font-bold text-[var(--muted)]">&copy; 2026 BrickVal. Built for LEGO collectors.</p>
            <Link href="/privacy" className="text-xs font-bold underline underline-offset-4 transition hover:opacity-70">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
