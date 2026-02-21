import "./globals.css";
import type { Metadata } from "next";

const SITE_URL = "https://orientnet.al";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: "ORIENT NET ISP",
    template: "%s | ORIENT NET ISP",
  },
  description: "Internet Fiber Optike në Shqipëri",

  // ✅ uses your existing files in /public
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/apple-touch.png",
  },

  openGraph: {
    type: "website",
    url: SITE_URL,
    title: "ORIENT NET ISP",
    description: "Internet Fiber Optike në Shqipëri",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ORIENT NET ISP",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "ORIENT NET ISP",
    description: "Internet Fiber Optike në Shqipëri",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Orient Net",
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.png`, // ✅ uses your existing logo file
  };

  return (
    <html lang="sq" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}