import { Hero } from "@/components/home/Hero";
// PricingSection hidden for MVP — Phase 2 with Stripe

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "BrickVal",
  applicationCategory: "LifestyleApplication",
  operatingSystem: "iOS, Web",
  url: "https://brickvalue.live",
  description:
    "Scan LEGO sets and minifigures to see current USD market value, retirement status, and pricing evidence from BrickLink and eBay.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  image: "https://brickvalue.live/icon.png",
  publisher: {
    "@type": "Organization",
    name: "BrickVal",
    url: "https://brickvalue.live",
    logo: "https://brickvalue.live/icon.png",
  },
};

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
