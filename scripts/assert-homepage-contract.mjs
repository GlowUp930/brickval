import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const page = readFileSync(join(root, "src/app/page.tsx"), "utf8");
const hero = readFileSync(join(root, "src/components/home/Hero.tsx"), "utf8");

const requiredPageMarkers = [
  'import { Hero } from "@/components/home/Hero"',
  "<Hero />",
];

const forbiddenPageMarkers = [
  "MobileHome",
  "localStorage.getItem",
  "router.replace(\"/onboarding\")",
];

const requiredHeroMarkers = [
  "Download on the",
  "iOS app launches 21 June 2026",
  "Pre-order the iOS app",
  "Try web app",
  "Photo scan",
  "USD values",
  "As seen in",
  "iOS app demo",
];

const failures = [];

for (const marker of requiredPageMarkers) {
  if (!page.includes(marker)) {
    failures.push(`src/app/page.tsx is missing required homepage marker: ${marker}`);
  }
}

for (const marker of forbiddenPageMarkers) {
  if (page.includes(marker)) {
    failures.push(`src/app/page.tsx contains forbidden mobile-dashboard marker: ${marker}`);
  }
}

for (const marker of requiredHeroMarkers) {
  if (!hero.includes(marker)) {
    failures.push(`src/components/home/Hero.tsx is missing redesigned homepage marker: ${marker}`);
  }
}

if (failures.length > 0) {
  console.error("Homepage contract failed. This prevents publishing the wrong web homepage.");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Homepage contract passed.");
