import { Hero } from "@/components/home/Hero";
// PricingSection hidden for MVP - Phase 2 with Stripe

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "BrickVal",
    url: "https://brickvalue.live",
    logo: "https://brickvalue.live/icon.png",
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "BrickVal",
    url: "https://brickvalue.live",
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "BrickVal",
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "iOS, Web",
    url: "https://brickvalue.live",
    image: "https://brickvalue.live/icon.png",
    description:
      "Scan LEGO sets and minifigures to estimate current USD market value using BrickLink, eBay, and set data.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  },
];

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Hero />
    </>
  );
}
