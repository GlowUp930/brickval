import type { Metadata } from "next";
import { Bricolage_Grotesque, Manrope } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const appUrl = new URL("https://brickvalue.live");
const siteTitle = "BrickVal - LEGO Set Value Scanner";
const siteDescription =
  "Scan LEGO sets and minifigures to estimate current USD market value using BrickLink, eBay, and set data.";

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["700", "800"],
});

const body = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: appUrl,
  applicationName: "BrickVal",
  title: {
    default: siteTitle,
    template: "%s | BrickVal",
  },
  description: siteDescription,
  keywords: [
    "LEGO value scanner",
    "LEGO set value",
    "LEGO price checker",
    "LEGO market value",
    "BrickLink price guide",
    "LEGO collection tracker",
    "minifigure value",
  ],
  authors: [{ name: "BrickVal" }],
  creator: "BrickVal",
  publisher: "BrickVal",
  category: "Utilities",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "BrickVal",
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: "/demo/brickval-demo-poster.jpg",
        width: 1200,
        height: 630,
        alt: "BrickVal LEGO value scanner app preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/demo/brickval-demo-poster.jpg"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "400x400" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "400x400" }],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "BrickVal",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const appShell = (
    <html lang="en">
      <body
        className={`${display.variable} ${body.variable} antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );

  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!clerkPublishableKey) {
    return appShell;
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey} signInForceRedirectUrl="/scan" signUpForceRedirectUrl="/scan">
      {appShell}
    </ClerkProvider>
  );
}
