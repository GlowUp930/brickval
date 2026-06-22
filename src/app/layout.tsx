import type { Metadata } from "next";
import { Bricolage_Grotesque, Manrope } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const siteUrl = "https://brickvalue.live";
const title = "BrickVal - LEGO Set Value Scanner";
const description =
  "Scan a LEGO set or minifigure and get its current USD market value, retirement status, and pricing evidence from BrickLink and eBay.";

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
  metadataBase: new URL(siteUrl),
  applicationName: "BrickVal",
  title,
  description,
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "256x256", type: "image/x-icon" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "512x512", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "BrickVal",
    title,
    description,
    images: [
      {
        url: "/icon.png",
        width: 512,
        height: 512,
        alt: "BrickVal app icon",
      },
    ],
  },
  twitter: {
    card: "summary",
    title,
    description,
    images: ["/icon.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
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
